// POST /api/claim  body {"phone": "...", "token": "..."} → { ok, code, again?, sameDevice? }
//                  | { ok: false, error: phone|ended|soldout|busy|limit }   (SĐT đã nhận → again: true, cùng mã cũ)
// GET  /api/claim  → số mã đã phát / còn lại (không lộ SĐT, mã).
// GET  /api/claim?ping=1 → { ok: true }: web gọi khi khách mở trang để máy chủ khởi động sẵn, không đọc kho.
// Chạy ở vùng sin1 (vercel.json), cùng vùng với kho Blob.
// Kho: Vercel Blob private "hussio-voucher-ks20" (BLOB_STORE_ID, xác thực OIDC). 300 mã nằm trong env KS20_CODES.
// Phát mã xong thì ghi thêm Mã + SĐT vào form ẩn "HUSSIO - Sổ phát voucher khảo sát lần 2 (nội bộ)",
// form này đổ vào Google Sheet "HUSSIO - Kho mã voucher khảo sát lần 2 (20%)" để CSKH đối chiếu.
// Blob vẫn là nguồn chống trùng; Sheet chỉ là bản để xem.
import { get, put, BlobPreconditionFailedError } from '@vercel/blob';
import { waitUntil } from '@vercel/functions';
import { claim, stats, normalizePhone } from './_voucher.js';

const STATE_PATH = 'ks20/claims.json';
// Làm mới kho một lần: file chưa mang RESET_ID này thì các lượt nhận cũ (lượt thử nội bộ) được chuyển vào
// "archived" và mã được trả về kho. Không xoá dữ liệu; đổi chuỗi này chỉ khi thật sự muốn làm mới lần nữa.
const RESET_ID = '2026-10-18-xoa-luot-thu-noi-bo';
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

// lỗi ghi Sheet không làm hỏng việc phát mã: khách vẫn nhận mã, CSKH vẫn tra được trong Blob
async function logToSheet(code, phone) {
  try {
    const res = await fetch(LOG_FORM, {
      method: 'POST',
      body: new URLSearchParams({ [LOG_CODE]: code, [LOG_PHONE]: phone }),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) console.error('log sheet failed', res.status, code);
  } catch (err) {
    console.error('log sheet failed', code, err);
  }
}

// Gói Hobby: Blob bị khoá 30 ngày nếu vượt 10.000 lượt đọc / 2.000 lượt ghi mỗi tháng,
// nên giữ bản đọc gần nhất 10 giây. Bản cũ không gây phát trùng: ghi kèm ETag cũ sẽ bị từ chối rồi đọc lại.
const CACHE_MS = 10_000;
let cache = null;

const store = {
  async read(fresh) {
    if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.state;
    const r = await get(STATE_PATH, { access: 'private', useCache: false });   // null khi chưa có file
    let state = null;
    if (r && r.statusCode === 200) {
      const data = JSON.parse(await new Response(r.stream).text());
      let claims = data.claims || {};
      let archived = data.archived || [];
      if (data.resetId !== RESET_ID) {
        if (Object.keys(claims).length) archived = [...archived, { resetId: RESET_ID, archivedAt: new Date().toISOString(), claims }];
        claims = {};
      }
      state = { claims, archived, etag: r.blob.etag };
    }
    cache = { state, at: Date.now() };
    return state;
  },
  async write(claims, etag, prev) {
    const archived = (prev && prev.archived) || [];
    const opts = { access: 'private', addRandomSuffix: false, contentType: 'application/json' };
    if (etag) opts.ifMatch = etag; else opts.allowOverwrite = false;
    try {
      const res = await put(STATE_PATH, JSON.stringify({ resetId: RESET_ID, claims, archived }, null, 1), opts);
      cache = { state: { claims, archived, etag: res.etag }, at: Date.now() };
    } catch (err) {
      // lệch ETag, hoặc 2 khách cùng ghi lần đầu khi chưa có file → đọc lại rồi ghi kèm ETag mới
      if (err instanceof BlobPreconditionFailedError || !etag) err.conflict = true;
      throw err;
    }
  }
};

// chặn 1 IP gọi dồn dập: tối đa 10 lượt / 10 phút trên mỗi máy chủ đang chạy
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 600_000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 10;
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
    if (req.method === 'GET') return res.status(200).json(stats(await store.read(false), pool));
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

    // web gửi text/plain để khỏi preflight CORS, nên body có thể là chuỗi JSON
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (limited(ip)) return res.status(200).json({ ok: false, error: 'limit' });

    const result = await claim(store, pool, body && body.phone, new Date(), body && body.token);
    // trả mã cho khách ngay; ghi Sheet chạy nền sau khi đã trả lời (Vercel giữ hàm sống tới khi xong).
    // Khách lấy lại mã từ máy khác cũng ghi thêm 1 dòng (Sheet tra dòng đầu tiên nên không lệch);
    // chỉ bỏ qua khi chính máy đó thử lại vì mạng rớt, tránh dòng trùng.
    if (result.ok && !(result.again && result.sameDevice)) waitUntil(logToSheet(result.code, normalizePhone(body.phone)));
    return res.status(200).json(result);
  } catch (err) {
    console.error('claim failed', err);
    return res.status(200).json({ ok: false, error: 'busy' });
  }
}
