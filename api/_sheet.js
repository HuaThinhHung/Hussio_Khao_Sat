// Đồng bộ mã ↔ SĐT ra Google Sheet "HUSSIO - Kho mã voucher khảo sát lần 2 (20%)", tab "Kho mã".
// Sheet chỉ là bản soi để CSKH đối soát; nguồn sự thật là Blob (_voucher.js).
// Ghi thẳng bằng Google Sheets API (tài khoản dịch vụ), KHÔNG qua Google Form:
//   tìm dòng có cột A = mã, ghi cột B = SĐT, C = thời gian nhận. Mỗi mã đúng 1 dòng có sẵn,
//   nên ghi lại bao nhiêu lần cũng không sinh dòng trùng.
// Cần env GOOGLE_SERVICE_ACCOUNT_JSON (nguyên file JSON khoá của tài khoản dịch vụ), và Sheet phải được
// chia sẻ quyền Người chỉnh sửa cho client_email trong file đó. Thiếu → báo lỗi, bản ghi ở trạng thái PENDING.
import { createSign } from 'node:crypto';

export const SHEET_ID = '1tH7I4eZ0T0KN49zC-ydSVGHmpxhOgwCdsI_LsFYLYC0';
export const TAB = 'Kho mã';
const API = 'https://sheets.googleapis.com/v4/spreadsheets/' + SHEET_ID;
const q = range => encodeURIComponent(`'${TAB}'!${range}`);

let token = null;
async function accessToken(env = process.env) {
  if (token && token.exp > Date.now() + 60_000) return token.value;
  const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('missing GOOGLE_SERVICE_ACCOUNT_JSON');
  const sa = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600
  });
  const sig = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + sig }),
    signal: AbortSignal.timeout(8000)
  });
  const j = await res.json();
  if (!res.ok) throw new Error('google token ' + res.status + ' ' + (j.error_description || j.error || ''));
  token = { value: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return token.value;
}

async function call(path, init = {}) {
  const res = await fetch(API + path, {
    ...init,
    headers: { authorization: 'Bearer ' + await accessToken(), 'content-type': 'application/json' },
    signal: AbortSignal.timeout(10_000)
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('sheets ' + res.status + ' ' + ((j.error && j.error.message) || ''));
  return j;
}

// giờ VN dạng 24/10/2026 12:05 (Sheet locale VN tự hiểu là ngày giờ)
export function vnTime(iso) {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

// rows: [{ code, phone, at }] → { done: [code], missing: [code] }. Ném lỗi khi Google không ghi được.
export async function writeRows(rows) {
  const [colA, head] = await Promise.all([
    call('/values/' + q('A2:A1000')),
    call('/values/' + q('B2:C2') + '?valueRenderOption=FORMULA')
  ]);
  // cột B/C cũ là ARRAYFORMULA tra theo tab "Câu trả lời biểu mẫu 1" (tab này CSKH đã đổi thành bảng tay nên
  // công thức ra rỗng). Ghi thẳng giá trị thì phải bỏ công thức tràn, nếu không ô ghi vào sẽ báo #REF.
  const f = (head.values && head.values[0]) || [];
  if (f.some(v => String(v).startsWith('='))) await call('/values/' + q('B2:C2') + ':clear', { method: 'POST', body: '{}' });

  const rowOf = new Map(((colA.values) || []).map((r, i) => [String(r[0] || '').trim(), i + 2]));
  const data = [], done = [], missing = [];
  for (const r of rows) {
    const n = rowOf.get(r.code);
    if (!n) { missing.push(r.code); continue; }
    data.push({ range: `'${TAB}'!B${n}:C${n}`, values: [["'" + r.phone, vnTime(r.at)]] });   // dấu ' giữ số 0 đầu SĐT
    done.push(r.code);
  }
  if (data.length) await call('/values:batchUpdate', { method: 'POST', body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data }) });
  return { done, missing };
}

// đọc lại để kiểm chứng: { "<mã>": { phone, time } } cho các mã có SĐT
export async function readRows() {
  const j = await call('/values/' + q('A2:C1000'));
  const out = {};
  for (const [code, phone, time] of j.values || []) if (code && phone) out[code] = { phone: String(phone), time: time || '' };
  return out;
}
