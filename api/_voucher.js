// Phát mã voucher khảo sát lần 2 (20%): mỗi SĐT 1 mã.
// Trạng thái nằm trong 1 file JSON { claims: { "<SĐT>": { code, at } } } trên Vercel Blob (private).
// Ghi có điều kiện theo ETag nên 2 khách cùng lúc không nhận trùng mã; mã đã phát không bao giờ bị thu hồi.

export const END_AT = new Date('2026-11-16T23:59:59+07:00');

// SĐT di động VN về dạng 0xxxxxxxxx; sai định dạng trả "". Giống normalizePhone trong main.js.
export function normalizePhone(s) {
  s = String(s || '').replace(/[\s.\-()]/g, '');
  if (s.startsWith('+84')) s = '0' + s.slice(3);
  else if (s.startsWith('84') && s.length === 11) s = '0' + s.slice(2);
  return /^0[35789]\d{8}$/.test(s) ? s : '';
}

// store.read(fresh) → { claims, etag } | null; store.write(claims, etag) ném lỗi có err.conflict khi ETag lệch.
// SĐT đã nhận → trả lại đúng mã cũ (again: true), không bao giờ cấp mã thứ hai cho 1 SĐT.
// token: chuỗi ngẫu nhiên của từng máy (web tự tạo), lưu kèm lần nhận đầu; sameDevice cho web biết
// đây là lần thử lại của chính máy đó (mạng rớt sau lúc máy chủ đã phát mã).
export async function claim(store, codes, rawPhone, now = new Date(), token = '') {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, error: 'phone' };
  if (now > END_AT) return { ok: false, error: 'ended' };
  token = /^[\w-]{16,64}$/.test(String(token || '')) ? String(token) : '';

  for (let attempt = 0; attempt < 8; attempt++) {
    const state = await store.read(attempt > 0);
    const claims = { ...(state ? state.claims : {}) };
    const mine = claims[phone];
    if (mine) return { ok: true, code: mine.code, again: true, sameDevice: Boolean(token && mine.t === token) };
    const taken = new Set(Object.values(claims).map(c => c.code));
    const code = codes.find(c => !taken.has(c));
    if (!code) return { ok: false, error: 'soldout' };
    claims[phone] = token ? { code, at: now.toISOString(), t: token } : { code, at: now.toISOString() };
    try {
      await store.write(claims, state ? state.etag : null, state);
      return { ok: true, code };
    } catch (err) {
      if (!err || !err.conflict) throw err;
      await new Promise(r => setTimeout(r, 40 + Math.random() * 160));
    }
  }
  return { ok: false, error: 'busy' };
}

export function stats(state, codes) {
  const claimed = state ? Object.keys(state.claims).length : 0;
  return { ok: true, claimed, remaining: Math.max(codes.length - claimed, 0), total: codes.length };
}
