// Phát mã voucher khảo sát lần 2 (20%): mỗi SĐT 1 mã.
// Lưu trên Vercel Blob (private), xem ghi chú "Kho v2" bên dưới. Mã đã phát không bao giờ bị thu hồi.

export const END_AT = new Date('2026-11-16T23:59:59+07:00');

// SĐT di động VN về dạng 0xxxxxxxxx; sai định dạng trả "". Giống normalizePhone trong main.js.
export function normalizePhone(s) {
  s = String(s || '').replace(/[\s.\-()]/g, '');
  if (s.startsWith('+84')) s = '0' + s.slice(3);
  else if (s.startsWith('84') && s.length === 11) s = '0' + s.slice(2);
  return /^0[35789]\d{8}$/.test(s) ? s : '';
}

// Kho v2 (từ 2026-10-24): mỗi mã và mỗi SĐT là 1 file riêng, chỉ được TẠO 1 lần (không ghi đè).
// Bản v1 (1 file JSON + ETag) hỏng vì đọc file trả bản cũ → mọi lần ghi bị "ETag mismatch", khách không nhận được mã.
// kv.get(path) → object | null; kv.create(path, obj) → true, hoặc false khi file đã có; kv.list(prefix) → [path];
// kv.remove(path). reserved: { "<SĐT>": "<mã>" } các mã đã phát ngoài hệ thống (CSKH gửi tay, lượt cũ).
export const P_PHONE = 'ks20/v2/phone/';
export const P_CODE = 'ks20/v2/code/';

export async function claim(kv, codes, rawPhone, now = new Date(), token = '', reserved = {}) {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, error: 'phone' };
  token = /^[\w-]{16,64}$/.test(String(token || '')) ? String(token) : '';

  // SĐT đã nhận → trả lại đúng mã cũ, không bao giờ cấp mã thứ hai
  if (reserved[phone]) return { ok: true, code: reserved[phone], again: true, sameDevice: false };
  const mine = await kv.get(P_PHONE + phone + '.json');
  if (mine && mine.code) return { ok: true, code: mine.code, again: true, sameDevice: Boolean(token && mine.t === token) };
  if (now > END_AT) return { ok: false, error: 'ended' };

  const blocked = new Set(Object.values(reserved));
  let free = codes.filter(c => !blocked.has(c));
  const tried = new Set();
  for (let attempt = 0; attempt < 12; attempt++) {
    // vài lần đầu chọn ngẫu nhiên (thường trúng ngay); trượt nhiều thì liệt kê mã đã phát để chọn đúng mã còn trống
    if (attempt === 4) {
      const taken = new Set((await kv.list(P_CODE)).map(p => p.slice(P_CODE.length).replace(/\.json$/, '')));
      free = free.filter(c => !taken.has(c));
    }
    const left = free.filter(c => !tried.has(c));
    if (!left.length) return { ok: false, error: 'soldout' };
    const code = left[Math.floor(Math.random() * left.length)];
    tried.add(code);
    const rec = token ? { phone, at: now.toISOString(), t: token } : { phone, at: now.toISOString() };
    if (!(await kv.create(P_CODE + code + '.json', rec))) continue;       // mã vừa bị người khác lấy → thử mã khác
    const mineRec = token ? { code, at: now.toISOString(), t: token } : { code, at: now.toISOString() };
    if (await kv.create(P_PHONE + phone + '.json', mineRec)) return { ok: true, code };
    // cùng SĐT gửi 2 lần cùng lúc: trả mã lần kia đã giữ, nhả mã vừa lấy
    await kv.remove(P_CODE + code + '.json').catch(() => {});
    for (let i = 0; i < 3; i++) {
      const other = await kv.get(P_PHONE + phone + '.json');
      if (other && other.code) return { ok: true, code: other.code, again: true, sameDevice: Boolean(token && other.t === token) };
      await new Promise(r => setTimeout(r, 400));
    }
    return { ok: false, error: 'busy' };
  }
  return { ok: false, error: 'busy' };
}

export function stats(claimed, codes) {
  return { ok: true, claimed, remaining: Math.max(codes.length - claimed, 0), total: codes.length };
}
