// POST /api/claim  body {"phone", "token", "sid"} → { ok, code, again?, sameDevice? }
//                  | { ok: false, error: phone|ended|soldout|busy|limit }   (SĐT đã nhận → again: true, cùng mã cũ)
// GET  /api/claim            → số mã đã phát / còn lại (không lộ SĐT, mã).
// GET  /api/claim?ping=1     → { ok: true }: web gọi khi khách mở trang để máy chủ khởi động sẵn, không đọc kho.
// GET  /api/claim?export=csv&key=… → bảng Mã,SĐT,Thời gian nhận,Nguồn cho Google Sheet (IMPORTDATA).
// GET  /api/claim?sync-status | ?resync[&force=1]   (cần quyền quản trị, xem isAdmin)
//      sync-status: đếm SYNCED / PENDING / FAILED / NEEDS_REVIEW; resync: ghi lại Sheet các mã chưa SYNCED.
// Chạy ở vùng sin1 (vercel.json), cùng vùng với kho Blob.
// Nguồn sự thật: Vercel Blob private "hussio-voucher-ks20" (BLOB_STORE_ID, OIDC), xem _voucher.js. 300 mã trong env KS20_CODES.
// Sheet "Kho mã" chỉ là bản soi, ghi bằng Google Sheets API (_sheet.js) sau khi mã đã lưu xong; lỗi Sheet không ảnh hưởng khách.
import { timingSafeEqual } from 'node:crypto';
import { get, put, list, del } from '@vercel/blob';
import { waitUntil } from '@vercel/functions';
import { claim, stats, normalizePhone, issuedWithTime, P_MAP, P_PHONE, P_CODE, P_SYNC } from './_voucher.js';
import * as sheet from './_sheet.js';
import { syncEntries, resyncAll, syncStatus } from './_sync.js';

// Mã đã phát ngoài kho v2: lượt cũ ở kho v1 (ks20/claims.json, giữ nguyên làm lưu trữ) và mã CSKH gửi tay
// (Sheet "Câu trả lời biểu mẫu 1" ngày 24/10/2026). SĐT này nhập lại thấy đúng mã cũ; các mã này không phát lại.
// CSKH gửi tay thêm mã nào thì phải ghi vào đây, nếu không hệ thống có thể phát trùng.
const RESERVED = {
  '0985813085': 'HUSSIO_KS20_ZMRZ2U',
  '0982825284': 'HUSSIO_KS20_ZHNUHD'
};
const RESERVED_AT = {
  '0985813085': '2026-10-24T03:00:00Z',
  '0982825284': '2026-10-24T03:00:00Z'
};
// các địa chỉ đọc được kết quả API: tên miền chính, mọi link *.vercel.app của project, máy tính chạy thử.
const ORIGINS = [
  /^https?:\/\/khaosat\.hussio-vn\.com$/,
  /^https:\/\/hussio-khao-[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
];

// Form ẩn "Sổ phát voucher" chỉ còn là bản soi tuỳ chọn (bật bằng env LOG_FORM_MIRROR=1).
// Từ 24/10/2026 form này trả 401 và tab nhận của nó đã thành bảng CSKH nhập tay, nên mặc định tắt.
const LOG_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSd5jNwiQDPCL0h3v7uMFkHdViMFl8inid_u5-Ga9677sxxSnA/formResponse';
async function mirrorToForm(code, phone) {
  if (process.env.LOG_FORM_MIRROR !== '1') return;
  try {
    const res = await fetch(LOG_FORM, { method: 'POST', body: new URLSearchParams({ 'entry.1391917465': code, 'entry.1294366895': phone }), signal: AbortSignal.timeout(5000) });
    if (!res.ok) console.error('form mirror failed', res.status, code);
  } catch (err) { console.error('form mirror failed', code, err); }
}

// Gói Hobby: Blob bị khoá 30 ngày nếu vượt 10.000 lượt đọc / 2.000 lượt ghi mỗi tháng.
// Mỗi khách mới: 1 đọc + 4 ghi (mã, SĐT, cặp mã↔SĐT, trạng thái Sheet). Thống kê (GET) giữ 30 giây.
let lastError = '';
const kv = {
  async get(path) {
    const r = await get(path, { access: 'private', useCache: false });   // null khi chưa có file
    if (!r || r.statusCode !== 200) return null;
    return JSON.parse((await new Response(r.stream).text()) || 'null');
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
  // ghi đè được: chỉ dùng cho trạng thái đồng bộ Sheet, không dùng cho mã
  set: (path, obj) => put(path, JSON.stringify(obj), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' }),
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
  async listDetailed(prefix) {
    const out = [];
    let cursor;
    do {
      const r = await list({ prefix, cursor, limit: 1000 });
      out.push(...r.blobs.map(b => ({ pathname: b.pathname, uploadedAt: b.uploadedAt })));
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    return out;
  },
  remove: path => del(path)
};

let statsCache = null;
async function claimedCount() {
  if (statsCache && Date.now() - statsCache.at < 30_000) return statsCache.n;
  const codes = new Set(Object.values(RESERVED));
  for (const p of await kv.list(P_MAP)) codes.add(p.slice(P_MAP.length).split('__')[0]);
  statsCache = { n: codes.size, at: Date.now() };
  return statsCache.n;
}

// quản trị: header x-admin-key = env KS20_ADMIN_KEY, hoặc Vercel Cron gửi "Bearer <CRON_SECRET>".
function same(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
}
function isAdmin(req) {
  const env = process.env;
  return Boolean((env.KS20_ADMIN_KEY && same(req.headers['x-admin-key'], env.KS20_ADMIN_KEY)) ||
    (env.CRON_SECRET && same(req.headers.authorization, 'Bearer ' + env.CRON_SECRET)));
}

// chặn 1 IP gọi dồn dập: tối đa 30 lượt / 10 phút trên mỗi máy chủ đang chạy.
// Không để thấp: mạng 4G ở VN cho nhiều thuê bao chung 1 IP, khách thật sẽ bị chặn oan.
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 600_000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 30;
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
    const params = new URL(req.url || '/', 'http://x').searchParams;
    if (req.method === 'GET' && params.has('ping')) return res.status(200).json({ ok: true });
    // TẠM (24/10/2026): xoá 2 mã test theo yêu cầu anh Hưng, trả về kho. Gỡ ngay sau khi chạy.
    if (req.method === 'GET' && params.has('cleanup-test')) {
      const released = [];
      for (const p of ['0900000304', '0866865440']) {
        const rec = await kv.get(P_PHONE + p + '.json');
        if (!rec || !rec.code) continue;
        await del([P_PHONE + p + '.json', P_CODE + rec.code + '.json', P_MAP + rec.code + '__' + p, P_SYNC + p + '.json']).catch(() => {});
        released.push(rec.code);
      }
      statsCache = null;
      return res.status(200).json({ ok: true, released });
    }
    // bảng Mã/SĐT/Thời gian cho Google Sheet (IMPORTDATA). Sai khoá → 401. CDN giữ 5 phút để Google tải lại
    // nhiều lần cũng chỉ tốn ít lượt list Blob.
    if (req.method === 'GET' && params.get('export') === 'csv') {
      if (!same(params.get('key'), sheet.exportKey(pool))) return res.status(401).json({ ok: false, error: 'key' });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
      return res.status(200).send(sheet.exportCsv(await issuedWithTime(kv, RESERVED, RESERVED_AT)));
    }
    if (params.has('resync') || params.has('sync-status')) {
      if (!isAdmin(req)) return res.status(401).json({ ok: false, error: 'admin' });
      if (params.has('sync-status')) return res.status(200).json({ ok: true, ...(await syncStatus(kv, RESERVED)) });
      return res.status(200).json({ ok: true, ...(await resyncAll(kv, RESERVED, sheet, { force: params.get('force') === '1', reservedAt: RESERVED_AT })) });
    }
    if (req.method === 'GET') return res.status(200).json(stats(await claimedCount(), pool));
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

    // web gửi text/plain để khỏi preflight CORS, nên body có thể là chuỗi JSON
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (limited(ip)) return res.status(200).json({ ok: false, error: 'limit' });

    const now = new Date();
    const result = await claim(kv, pool, body.phone, now, body.token, RESERVED, body.sid, body.lookup === true);
    // mã đã lưu xong trong Blob → trả cho khách ngay; ghi Sheet chạy nền (Vercel giữ hàm sống tới khi xong)
    if (result.ok && result.isNew) {
      statsCache = null;
      const phone = normalizePhone(body.phone);
      waitUntil(Promise.all([
        // ghi thẳng bằng Sheets API chỉ khi đã có khoá Google; không có thì Sheet vẫn tự kéo qua ?export=csv
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON
          ? syncEntries(kv, [{ code: result.code, phone, at: now.toISOString() }], sheet).catch(err => console.error('sheet sync failed', err))
          : null,
        mirrorToForm(result.code, phone)
      ]));
    }
    const { isNew, ...out } = result;
    if (!out.ok && out.error === 'busy') return res.status(200).json({ ...out, detail: lastError });
    return res.status(200).json(out);
  } catch (err) {
    console.error('claim failed', err);
    lastError = `${err && err.name}: ${err && err.message}`.slice(0, 300);
    return res.status(200).json({ ok: false, error: 'busy', detail: lastError });
  }
}
