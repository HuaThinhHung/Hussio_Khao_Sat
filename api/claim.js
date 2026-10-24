// POST /api/claim  body {"phone": "...", "token": "..."} → { ok, code, again?, sameDevice? }
//                  | { ok: false, error: phone|ended|soldout|busy|limit }   (SĐT đã nhận → again: true, cùng mã cũ)
// GET  /api/claim  → số mã đã phát / còn lại (không lộ SĐT, mã).
// GET  /api/claim?resync → ghi bù vào Sheet các mã đã phát mà form ẩn chưa nhận được.
// GET  /api/claim?ping=1 → { ok: true }: web gọi khi khách mở trang để máy chủ khởi động sẵn, không đọc kho.
// Chạy ở vùng sin1 (vercel.json), cùng vùng với kho Blob.
// Kho: Vercel Blob private "hussio-voucher-ks20", mỗi SĐT/mã 1 file (xem _voucher.js) (BLOB_STORE_ID, xác thực OIDC). 300 mã nằm trong env KS20_CODES.
// Phát mã xong thì ghi thêm Mã + SĐT vào form ẩn "HUSSIO - Sổ phát voucher khảo sát lần 2 (nội bộ)",
// form này đổ vào Google Sheet "HUSSIO - Kho mã voucher khảo sát lần 2 (20%)" để CSKH đối chiếu.
// Blob vẫn là nguồn chống trùng; Sheet chỉ là bản để xem.
import { get, put, list, del } from '@vercel/blob';
import { waitUntil } from '@vercel/functions';
import { claim, stats, normalizePhone, P_PHONE } from './_voucher.js';

// Mã đã phát ngoài kho v2: lượt cũ còn hiệu lực ở kho v1 (ks20/claims.json, giữ nguyên làm lưu trữ)
// và mã CSKH gửi tay theo Sheet ngày 24/10/2026. Các SĐT này nhập lại sẽ thấy đúng mã cũ; các mã này không phát lại.
const RESERVED = {
  '0866865440': 'HUSSIO_KS20_27342X',
  '0985813085': 'HUSSIO_KS20_ZMRZ2U',
  '0982825284': 'HUSSIO_KS20_ZHNUHD'
};
// các địa chỉ đọc được kết quả API: tên miền chính, mọi link *.vercel.app của project (kể cả link deploy riêng),
// và máy tính chạy thử. Thiếu địa chỉ nào thì trình duyệt chặn đọc kết quả dù máy chủ đã phát mã.
const ORIGINS = [
  /^https?:\/\/khaosat\.hussio-vn\.com$/,
  /^https:\/\/hussio-khao-[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
];
const LOG_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSd5jNwiQDPCL0h3v7uMFkHdViMFl8inid_u5-Ga9677sxxSnA/formResponse';
const LOG_CODE = 'entry.1391917465';
const LOG_PHONE = 'entry.1294366895';

// lỗi ghi Sheet không làm hỏng việc phát mã: khách vẫn nhận mã, Blob vẫn giữ SĐT ↔ mã.
// Ghi được thì tạo file đánh dấu ks20/v2/logged/<sđt>; GET ?resync ghi bù mọi SĐT chưa có dấu
// (dùng khi form ẩn bị khoá rồi mở lại: form trả 401 nếu Người trả lời bị đặt "Hạn chế").
const P_LOGGED = 'ks20/v2/logged/';
async function logToSheet(code, phone, mark = true) {
  try {
    const res = await fetch(LOG_FORM, {
      method: 'POST',
      body: new URLSearchParams({ [LOG_CODE]: code, [LOG_PHONE]: phone }),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) { console.error('log sheet failed', res.status, code); return false; }
    if (mark) await kv.create(P_LOGGED + phone + '.json', { code, at: new Date().toISOString() }).catch(() => {});
    return true;
  } catch (err) {
    console.error('log sheet failed', code, err);
    return false;
  }
}

async function resync() {
  const logged = new Set((await kv.list(P_LOGGED)).map(p => p.slice(P_LOGGED.length)));
  const out = { sent: 0, failed: 0, already: logged.size };
  for (const path of await kv.list(P_PHONE)) {
    const file = path.slice(P_PHONE.length);
    if (logged.has(file)) continue;
    const rec = await kv.get(path);
    if (!rec || !rec.code) continue;
    if (await logToSheet(rec.code, file.replace(/\.json$/, ''))) out.sent++; else { out.failed++; break; }
  }
  return out;
}

// Gói Hobby: Blob bị khoá 30 ngày nếu vượt 10.000 lượt đọc / 2.000 lượt ghi mỗi tháng.
// Mỗi khách mới tốn 1 lượt đọc + 2 lượt ghi; số liệu thống kê (GET) giữ 30 giây.
let lastError = '';
const kv = {
  async get(path) {
    const r = await get(path, { access: 'private', useCache: false });   // null khi chưa có file
    if (!r || r.statusCode !== 200) return null;
    return JSON.parse(await new Response(r.stream).text());
  },
  // chỉ tạo mới, không ghi đè: máy chủ Blob từ chối nếu file đã có → đây là chốt chống phát trùng
  async create(path, obj) {
    try {
      await put(path, JSON.stringify(obj), { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json' });
      return true;
    } catch (err) {
      lastError = `${err && err.name}: ${err && err.message}`.slice(0, 300);
      if (/exist|precondition|overwrite/i.test(String(err && err.message))) return false;
      throw err;
    }
  },
  async list(prefix) {
    const out = [];
    let cursor;
    do {
      const r = await list({ prefix, cursor, limit: 1000 });
      out.push(...r.blobs.map(b => b.pathname));
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    return out;
  },
  remove: path => del(path)
};
let statsCache = null;
async function claimedCount() {
  if (statsCache && Date.now() - statsCache.at < 30_000) return statsCache.n;
  const n = (await kv.list(P_PHONE)).length + Object.keys(RESERVED).length;
  statsCache = { n, at: Date.now() };
  return n;
}

// chặn 1 IP gọi dồn dập: tối đa 30 lượt / 10 phút trên mỗi máy chủ đang chạy.
// Không để thấp: mạng 4G ở VN cho nhiều thuê bao chung 1 IP, khách thật sẽ bị chặn oan.
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 600_000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 30;
}

function codes() {
  return (process.env.KS20_CODES || '').split(',').map(s => s.trim()).filter(Boolean);
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && ORIGINS.some(re => re.test(origin))) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  const pool = codes();
  if (!pool.length) return res.status(500).json({ ok: false, error: 'config' });

  try {
    if (req.method === 'GET' && new URL(req.url || '/', 'http://x').searchParams.has('ping')) return res.status(200).json({ ok: true });
    if (req.method === 'GET' && new URL(req.url || '/', 'http://x').searchParams.has('resync')) return res.status(200).json({ ok: true, ...(await resync()) });
    if (req.method === 'GET') return res.status(200).json(stats(await claimedCount(), pool));
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

    // web gửi text/plain để khỏi preflight CORS, nên body có thể là chuỗi JSON
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (limited(ip)) return res.status(200).json({ ok: false, error: 'limit' });

    const result = await claim(kv, pool, body && body.phone, new Date(), body && body.token, RESERVED);
    if (result.ok && !result.again) statsCache = null;
    // trả mã cho khách ngay; ghi Sheet chạy nền sau khi đã trả lời (Vercel giữ hàm sống tới khi xong).
    // Khách lấy lại mã từ máy khác cũng ghi thêm 1 dòng (Sheet tra dòng đầu tiên nên không lệch);
    // chỉ bỏ qua khi chính máy đó thử lại vì mạng rớt, tránh dòng trùng.
    if (result.ok && !(result.again && result.sameDevice)) waitUntil(logToSheet(result.code, normalizePhone(body.phone), !result.again));
    if (!result.ok && result.error === 'busy') return res.status(200).json({ ...result, detail: lastError });
    return res.status(200).json(result);
  } catch (err) {
    console.error('claim failed', err);
    lastError = `${err && err.name}: ${err && err.message}`.slice(0, 300);
    return res.status(200).json({ ok: false, error: 'busy', detail: lastError });
  }
}
