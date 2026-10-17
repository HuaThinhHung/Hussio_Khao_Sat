// POST /api/claim  body {"phone": "..."} → { ok, code } | { ok: false, error: phone|ended|used|soldout|busy|limit }
// GET  /api/claim  → số mã đã phát / còn lại (không lộ SĐT, mã).
// Kho: Vercel Blob private "hussio-voucher-ks20" (BLOB_STORE_ID, xác thực OIDC). 300 mã nằm trong env KS20_CODES.
import { get, put, BlobPreconditionFailedError } from '@vercel/blob';
import { claim, stats } from './_voucher.js';

const STATE_PATH = 'ks20/claims.json';
const ORIGINS = ['https://khaosat.hussio-vn.com', 'https://hussio-khao-sat.vercel.app', 'http://localhost:5173'];

// Gói Hobby: Blob bị khoá 30 ngày nếu vượt 10.000 lượt đọc / 2.000 lượt ghi mỗi tháng,
// nên giữ bản đọc gần nhất 10 giây. Bản cũ không gây phát trùng: ghi kèm ETag cũ sẽ bị từ chối rồi đọc lại.
const CACHE_MS = 10_000;
let cache = null;

const store = {
  async read(fresh) {
    if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.state;
    const r = await get(STATE_PATH, { access: 'private', useCache: false });   // null khi chưa có file
    const state = r && r.statusCode === 200
      ? { claims: JSON.parse(await new Response(r.stream).text()).claims || {}, etag: r.blob.etag }
      : null;
    cache = { state, at: Date.now() };
    return state;
  },
  async write(claims, etag) {
    const opts = { access: 'private', addRandomSuffix: false, contentType: 'application/json' };
    if (etag) opts.ifMatch = etag; else opts.allowOverwrite = false;
    try {
      const res = await put(STATE_PATH, JSON.stringify({ claims }, null, 1), opts);
      cache = { state: { claims, etag: res.etag }, at: Date.now() };
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
  if (ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
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
    if (req.method === 'GET') return res.status(200).json(stats(await store.read(false), pool));
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

    // web gửi text/plain để khỏi preflight CORS, nên body có thể là chuỗi JSON
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (limited(ip)) return res.status(200).json({ ok: false, error: 'limit' });

    return res.status(200).json(await claim(store, pool, body && body.phone));
  } catch (err) {
    console.error('claim failed', err);
    return res.status(200).json({ ok: false, error: 'busy' });
  }
}
