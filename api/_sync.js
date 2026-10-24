// Outbox đồng bộ Sheet. Mỗi SĐT có ks20/v2/sync/<sđt>.json:
//   { code, status: PENDING | SYNCED | FAILED | NEEDS_REVIEW, attempts, lastError, sheetSyncedAt }
// Phát mã xong → ghi Sheet ngay (chạy nền). Lỗi → FAILED, mã của khách vẫn an toàn trong Blob.
// resyncAll chỉ đọc cặp mã ↔ SĐT đã có rồi ghi lại Sheet: không bao giờ tạo mã mới, không sinh dòng trùng.
import { P_PHONE, P_SYNC, allIssued } from './_voucher.js';

async function setStatus(kv, phone, patch) {
  const path = P_SYNC + phone + '.json';
  const prev = (await kv.get(path)) || { attempts: 0 };
  const next = { ...prev, ...patch, attempts: (prev.attempts || 0) + (patch.status === 'SYNCED' && prev.status === 'SYNCED' ? 0 : 1) };
  await kv.set(path, next);
  return next;
}

// entries: [{ code, phone, at }]; writer.writeRows(rows) → { done, missing }
export async function syncEntries(kv, entries, writer) {
  const out = { synced: 0, failed: 0, needsReview: 0, errors: [] };
  if (!entries.length) return out;
  try {
    const { done, missing } = await writer.writeRows(entries);
    const now = new Date().toISOString();
    for (const e of entries) {
      if (done.includes(e.code)) { await setStatus(kv, e.phone, { code: e.code, status: 'SYNCED', lastError: '', sheetSyncedAt: now }); out.synced++; }
      else if (missing.includes(e.code)) { await setStatus(kv, e.phone, { code: e.code, status: 'NEEDS_REVIEW', lastError: 'mã không có trong cột A tab Kho mã' }); out.needsReview++; }
    }
  } catch (err) {
    const msg = String((err && err.message) || err).slice(0, 300);
    out.errors.push(msg);
    for (const e of entries) { await setStatus(kv, e.phone, { code: e.code, status: 'FAILED', lastError: msg }); out.failed++; }
  }
  return out;
}

// thời gian nhận: lấy từ file SĐT; mã giữ chỗ lấy theo reservedAt
async function withTime(kv, rows, reservedAt) {
  return Promise.all(rows.map(async r => {
    if (r.source === 'RESERVED') return { ...r, at: reservedAt[r.phone] || '' };
    const rec = await kv.get(P_PHONE + r.phone + '.json');
    return { ...r, at: (rec && rec.at) || '' };
  }));
}

export async function resyncAll(kv, reserved, writer, { force = false, reservedAt = {} } = {}) {
  const issued = await allIssued(kv, reserved);
  const todo = [];
  let alreadySynced = 0;
  for (const r of issued) {
    const s = await kv.get(P_SYNC + r.phone + '.json');
    if (!force && s && s.status === 'SYNCED' && s.code === r.code) { alreadySynced++; continue; }
    todo.push(r);
  }
  const res = await syncEntries(kv, await withTime(kv, todo, reservedAt), writer);
  return { total: issued.length, alreadySynced, ...res };
}

export async function syncStatus(kv, reserved) {
  const issued = await allIssued(kv, reserved);
  const count = { total: issued.length, SYNCED: 0, PENDING: 0, FAILED: 0, NEEDS_REVIEW: 0 };
  const notSynced = [];
  for (const r of issued) {
    const s = await kv.get(P_SYNC + r.phone + '.json');
    const st = (s && s.code === r.code && s.status) || 'PENDING';
    count[st] = (count[st] || 0) + 1;
    if (st !== 'SYNCED') notSynced.push({ code: r.code, status: st, attempts: (s && s.attempts) || 0, lastError: (s && s.lastError) || '' });
  }
  return { ...count, notSynced };
}
