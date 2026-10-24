import test from 'node:test';
import assert from 'node:assert/strict';
import { claim, allIssued, P_PHONE, P_CODE } from '../api/_voucher.js';
import { memoryKv } from './helpers.mjs';

const CODES = Array.from({ length: 60 }, (_, i) => 'HUSSIO_KS20_T' + String(i).padStart(4, '0'));
const RES = { '0866865440': CODES[0], '0985813085': CODES[1] };
const TOK = 'device-token-aaaaaaaaaaaa';

test('khách mới nhận 1 mã, lưu đủ mã ↔ SĐT ↔ sid', async () => {
  const kv = memoryKv();
  const r = await claim(kv, CODES, '0912345678', new Date(), TOK, RES, 'sid-12345678');
  assert.ok(r.ok && r.isNew);
  assert.equal((await kv.get(P_PHONE + '0912345678.json')).code, r.code);
  assert.equal((await kv.get(P_CODE + r.code + '.json')).phone, '0912345678');
  assert.equal((await kv.get(P_PHONE + '0912345678.json')).sid, 'sid-12345678');
  assert.deepEqual((await allIssued(kv, {})).map(x => [x.code, x.phone]), [[r.code, '0912345678']]);
});

test('tải lại / bấm lại / thử lại cùng SĐT: luôn cùng 1 mã, không sinh mã thứ hai', async () => {
  const kv = memoryKv();
  const first = await claim(kv, CODES, '0912345678', new Date(), TOK, RES);
  for (const p of ['0912345678', '912345678', '+84912345678']) {
    const again = await claim(kv, CODES, p, new Date(), TOK, RES);
    assert.equal(again.code, first.code);
    assert.ok(again.again && again.sameDevice && !again.isNew);
  }
  assert.equal((await kv.list(P_CODE)).length, 1);
});

test('10 yêu cầu đồng thời cùng SĐT (double click, Vercel retry): đúng 1 mã', async () => {
  const kv = memoryKv();
  const rs = await Promise.all(Array.from({ length: 10 }, () => claim(kv, CODES, '0912345678', new Date(), TOK, RES)));
  assert.ok(rs.every(r => r.ok));
  assert.equal(new Set(rs.map(r => r.code)).size, 1);
  assert.equal((await kv.list(P_CODE)).length, 1, 'mã thừa đã được nhả');
});

test('50 khách khác nhau cùng lúc: 50 mã khác nhau, không đụng mã giữ chỗ, hết mã báo soldout', async () => {
  const kv = memoryKv();
  const phones = Array.from({ length: 50 }, (_, i) => '09100000' + String(i).padStart(2, '0'));
  const rs = await Promise.all(phones.map(p => claim(kv, CODES, p, new Date(), '', RES)));
  assert.ok(rs.every(r => r.ok));
  const codes = rs.map(r => r.code);
  assert.equal(new Set(codes).size, 50);
  assert.ok(!codes.includes(CODES[0]) && !codes.includes(CODES[1]));
  const more = await Promise.all(Array.from({ length: 12 }, (_, i) => claim(kv, CODES, '09200000' + String(i).padStart(2, '0'), new Date(), '', RES)));
  assert.equal(more.filter(r => r.ok).length, 8);
  assert.equal(more.filter(r => r.error === 'soldout').length, 4);
});

test('SĐT giữ chỗ thấy đúng mã CSKH đã gửi; SĐT sai bị từ chối; hết hạn không phát mã mới', async () => {
  const kv = memoryKv();
  assert.equal((await claim(kv, CODES, '985813085', new Date(), '', RES)).code, CODES[1]);
  assert.equal((await claim(kv, CODES, '0123', new Date(), '', RES)).error, 'phone');
  assert.equal((await claim(kv, CODES, '0912345678', new Date('2026-12-01'), '', RES)).error, 'ended');
});
