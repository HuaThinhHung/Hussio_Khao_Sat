import test from 'node:test';
import assert from 'node:assert/strict';
import { claim } from '../api/_voucher.js';
import { syncEntries, resyncAll, syncStatus } from '../api/_sync.js';
import { vnTime } from '../api/_sheet.js';
import { memoryKv, memorySheet } from './helpers.mjs';

const CODES = Array.from({ length: 20 }, (_, i) => 'HUSSIO_KS20_S' + String(i).padStart(4, '0'));
const RES = { '0866865440': CODES[0] };
const AT = { '0866865440': '2026-10-19T08:34:23Z' };

async function issue(kv, sheet, phone) {
  const now = new Date();
  const r = await claim(kv, CODES, phone, now, '', RES);
  if (r.isNew) await syncEntries(kv, [{ code: r.code, phone, at: now.toISOString() }], sheet);
  return r;
}

test('Sheet hoạt động: mã ↔ SĐT ↔ thời gian ghi đúng dòng, trạng thái SYNCED', async () => {
  const kv = memoryKv(), sheet = memorySheet(CODES);
  const r = await issue(kv, sheet, '0912345678');
  assert.equal(sheet.rows.get(r.code).phone, '0912345678');
  assert.ok(sheet.rows.get(r.code).time);
  const st = await syncStatus(kv, {});
  assert.equal(st.SYNCED, 1);
  assert.equal(st.PENDING, 0);
});

test('Sheet sập: khách vẫn có mã, mã vẫn lưu, FAILED; Sheet sống lại → resync ghi đủ, SYNCED', async () => {
  const kv = memoryKv(), sheet = memorySheet(CODES);
  sheet.down = true;
  const a = await issue(kv, sheet, '0912345678');
  const b = await issue(kv, sheet, '0912345679');
  assert.ok(a.ok && b.ok && a.code !== b.code);
  let st = await syncStatus(kv, RES);
  assert.equal(st.FAILED, 2);
  assert.equal(st.PENDING, 1, 'mã giữ chỗ chưa từng ghi');
  assert.match(st.notSynced.find(x => x.code === a.code).lastError, /503/);

  sheet.down = false;
  const res = await resyncAll(kv, RES, sheet, { reservedAt: AT });
  assert.deepEqual([res.total, res.synced, res.failed, res.alreadySynced], [3, 3, 0, 0]);
  assert.equal(sheet.rows.get(a.code).phone, '0912345678');
  assert.equal(sheet.rows.get(b.code).phone, '0912345679');
  assert.equal(sheet.rows.get(CODES[0]).phone, '0866865440');
  assert.equal(sheet.rows.get(CODES[0]).time, AT['0866865440']);
  st = await syncStatus(kv, RES);
  assert.equal(st.SYNCED, 3);
});

test('resync lặp lại: không tạo mã mới, không ghi lại dòng đã SYNCED, không sinh dòng trùng', async () => {
  const kv = memoryKv(), sheet = memorySheet(CODES);
  await issue(kv, sheet, '0912345678');
  const codesBefore = (await kv.list('ks20/v2/code/')).length;
  const writes = sheet.writes;
  const r1 = await resyncAll(kv, RES, sheet, { reservedAt: AT });
  const r2 = await resyncAll(kv, RES, sheet, { reservedAt: AT });
  assert.equal(r1.synced, 1);
  assert.deepEqual([r2.total, r2.alreadySynced, r2.synced], [2, 2, 0]);
  assert.equal((await kv.list('ks20/v2/code/')).length, codesBefore, 'resync không phát mã');
  assert.equal(sheet.writes, writes + 1);
  assert.equal([...sheet.rows.values()].filter(v => v.phone === '0912345678').length, 1, 'mỗi SĐT đúng 1 dòng');
  const forced = await resyncAll(kv, RES, sheet, { force: true, reservedAt: AT });
  assert.equal(forced.synced, 2);
  assert.equal([...sheet.rows.values()].filter(v => v.phone).length, 2, 'ghi đè đúng dòng, không thêm dòng');
});

test('mã không có trong tab Kho mã → NEEDS_REVIEW, không bịa dòng', async () => {
  const kv = memoryKv(), sheet = memorySheet(CODES.slice(5));
  const r = await syncEntries(kv, [{ code: CODES[0], phone: '0912345678', at: '' }], sheet);
  assert.equal(r.needsReview, 1);
  assert.equal((await syncStatus(kv, { '0912345678': CODES[0] })).NEEDS_REVIEW, 1);
});

test('vnTime đổi sang giờ Việt Nam', () => {
  assert.equal(vnTime('2026-10-24T05:07:00Z'), '24/10/2026 12:07');
  assert.equal(vnTime('2026-10-19T17:30:00Z'), '20/10/2026 00:30');
  assert.equal(vnTime(''), '');
});
