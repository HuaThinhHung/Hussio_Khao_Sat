// Phát mã voucher khảo sát lần 2 (20%): mỗi SĐT 1 mã. Mã đã phát không bao giờ bị thu hồi.
// Nguồn sự thật là Vercel Blob (private), kho v2 (từ 2026-10-24):
//   ks20/v2/code/<mã>.json      { phone, at, t?, sid? }   khoá mã: chỉ TẠO 1 lần → không 2 khách trùng mã
//   ks20/v2/phone/<sđt>.json    { code, at, t?, sid? }    khoá SĐT: chỉ TẠO 1 lần → 1 SĐT đúng 1 mã
//   ks20/v2/map/<mã>__<sđt>     (rỗng)                    liệt kê mọi cặp mã ↔ SĐT bằng 1 lệnh list
//   ks20/v2/sync/<sđt>.json     { status, attempts, ... } trạng thái đồng bộ Sheet (outbox)
// Bản v1 (1 file JSON + ETag) hỏng vì đọc ra bản cũ → mọi lần ghi bị "ETag mismatch".
// kv.get(path) → object | null; kv.create(path, obj) → true | false (đã có); kv.list(prefix) → [path]; kv.remove(path)

export const END_AT = new Date('2026-11-16T23:59:59+07:00');
export const P_PHONE = 'ks20/v2/phone/';
export const P_CODE = 'ks20/v2/code/';
export const P_MAP = 'ks20/v2/map/';
export const P_SYNC = 'ks20/v2/sync/';

// SĐT di động VN về dạng 0xxxxxxxxx; sai định dạng trả "".
// Nhận: 0982825284, 982825284, +84982825284, 84982825284, có dấu cách/chấm/gạch.
// main.js có bản chép y hệt (web không import được file này); test/phone.test.mjs kiểm tra 2 bản khớp nhau.
export function normalizePhone(s) {
  s = String(s || '').replace(/[\s.\-()]/g, '');
  if (s.startsWith('+84')) s = s.slice(3);
  else if (s.startsWith('84') && s.length === 11) s = s.slice(2);
  if (/^[35789]\d{8}$/.test(s)) s = '0' + s;
  return /^0[35789]\d{8}$/.test(s) ? s : '';
}

const clean = (v, re) => (re.test(String(v || '')) ? String(v) : '');

// SĐT đã nhận → trả lại đúng mã cũ (again: true). Đồng thời / bấm 2 lần / mạng thử lại đều ra cùng 1 mã.
// token: chuỗi ngẫu nhiên của từng trình duyệt; sid: mã lượt khảo sát (web tạo). Lưu kèm để đối soát.
// reserved: { "<SĐT>": "<mã>" } mã đã phát ngoài kho v2 (CSKH gửi tay, lượt cũ).
export async function claim(kv, codes, rawPhone, now = new Date(), token = '', reserved = {}, sid = '') {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, error: 'phone' };
  token = clean(token, /^[\w-]{16,64}$/);
  sid = clean(sid, /^[\w-]{8,64}$/);

  if (reserved[phone]) return { ok: true, code: reserved[phone], again: true, sameDevice: false };
  const mine = await kv.get(P_PHONE + phone + '.json');
  if (mine && mine.code) return { ok: true, code: mine.code, again: true, sameDevice: Boolean(token && mine.t === token) };
  if (now > END_AT) return { ok: false, error: 'ended' };

  const blocked = new Set(Object.values(reserved));
  let free = codes.filter(c => !blocked.has(c));
  const tried = new Set();
  const base = { at: now.toISOString(), ...(token && { t: token }), ...(sid && { sid }) };
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
    if (!(await kv.create(P_CODE + code + '.json', { phone, ...base }))) continue;   // mã vừa bị người khác lấy
    if (await kv.create(P_PHONE + phone + '.json', { code, ...base })) {
      await kv.create(P_MAP + code + '__' + phone, {});
      return { ok: true, code, isNew: true };
    }
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

// mọi cặp mã ↔ SĐT đã phát (kho v2 + mã giữ chỗ), sắp theo mã. Chỉ đọc, không tạo gì.
export async function allIssued(kv, reserved = {}) {
  const out = new Map(Object.entries(reserved).map(([phone, code]) => [code, { code, phone, at: '', source: 'RESERVED' }]));
  for (const p of await kv.list(P_MAP)) {
    const [code, phone] = p.slice(P_MAP.length).split('__');
    if (code && phone && !out.has(code)) out.set(code, { code, phone, at: '', source: 'WEB' });
  }
  return [...out.values()];
}

// cho bảng xuất Sheet: kv.listDetailed(prefix) → [{ pathname, uploadedAt }]; giờ tạo file map = giờ phát mã.
// 1 lệnh list cho toàn bộ (không đọc từng file) để giữ trong hạn mức Blob gói Hobby.
export async function issuedWithTime(kv, reserved = {}, reservedAt = {}) {
  const out = new Map(Object.entries(reserved).map(([phone, code]) => [code, { code, phone, at: reservedAt[phone] || '', source: 'CSKH' }]));
  for (const b of await kv.listDetailed(P_MAP)) {
    const [code, phone] = b.pathname.slice(P_MAP.length).split('__');
    if (code && phone && !out.has(code)) out.set(code, { code, phone, at: new Date(b.uploadedAt).toISOString(), source: 'WEB' });
  }
  return [...out.values()].sort((a, b) => (a.at < b.at ? -1 : 1));
}

export function stats(claimed, codes) {
  return { ok: true, claimed, remaining: Math.max(codes.length - claimed, 0), total: codes.length };
}
