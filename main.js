// Google Form "Khảo Sát Hussio quý 2" (lần 2). Form phải được Xuất bản thì mới nhận câu trả lời.
const GFORM = "https://docs.google.com/forms/d/e/1FAIpQLSfE_xgdVbnWvxjSlitcAfenjT5IWHxxS0pesPKhIM2LYWbS_w/formResponse";

// Voucher cảm ơn: mỗi SĐT 1 mã riêng (300 mã tạo sẵn trên Shopify, chương trình "Khảo sát lần 2 - Giảm 20%").
// claimUrl = API phát mã trên Vercel (api/claim.js). Để trống hoặc API lỗi thì khách nhận voucher qua Zalo.
// Mở trang trên *.vercel.app thì gọi cùng địa chỉ (không qua CORS); còn lại gọi tên miền chính của API.
const VOUCHER = {
  claimUrl: location.hostname.endsWith('.vercel.app') ? "/api/claim" : "https://hussio-khao-sat.vercel.app/api/claim",
  linkBase: "https://hussio.com/discount/",
  note: "Mỗi mã dùng 1 lần · Hiệu lực đến 23:59 ngày 16/11/2026 · Áp dụng cho mọi đơn hàng trên hussio.com"
};
// _v2: bỏ qua mã đã lưu trong trình duyệt từ các lượt thử trước ngày 18/10/2026 (các mã đó đã trả về kho)
const CLAIM_KEY = "hussio_ks2_voucher_v2";
const TOKEN_KEY = "hussio_ks2_token";

// o: [chữ hiển thị, giá trị gửi về form]. Giá trị phải khớp từng ký tự với đáp án trong Google Form.
const QUESTIONS = [
  { e:"entry.1205774175", t:"Anh/chị thuộc nhóm độ tuổi nào dưới đây?",
    o:[["Dưới 25 tuổi","Dưới 25 tuổi"],["Từ 25 – 30 tuổi","từ 25 - 30 tuổi"],["Từ 31 – 35 tuổi","từ 31 - 35 tuổi"],["Trên 35 tuổi","Trên 35 tuổi"]] },
  { e:"entry.950424376", t:"Anh/chị đã sử dụng sản phẩm của HUSSIO bao lâu rồi ạ?",
    o:[["Dưới 6 tháng","Dưới 6 tháng"],["Dưới 1 năm","Dưới 1 năm"],["Trên 1 năm","Trên 1 năm"],["Trên 3 năm","Trên 3 năm"]] },
  { e:"entry.566680951", t:"Theo anh/chị, HUSSIO đang đại diện cho hình ảnh nào nhất?",
    o:[["Hiện đại – Thanh lịch – Tối giản","Hiện đại - Thanh lịch - Tối giản"],["Trẻ trung – Năng động – Phóng khoáng","Trẻ trung - Năng động - Phóng khoáng"],["Nam tính – Trưởng thành – Bản lĩnh","Nam tính - Trưởng thành - Bản lĩnh"],["Tinh tế – Cao cấp – Vượt thời gian","Tinh tế – Cao cấp – Vượt thời gian"]] },
  { e:"entry.720087482", t:"Yếu tố nào khiến anh/chị quay lại mua sản phẩm của HUSSIO?",
    o:[["Form dáng mặc đẹp","Form dáng mặc đẹp"],["Chất lượng ổn định","Chất lượng ổn định"],["Sản phẩm có thiết kế phù hợp","Sản phẩm có thiết kế phù hợp"],["Giá thành hợp lí","Giá thành hợp lí"]] },
  { e:"entry.911577976", t:"Đố vui tí nhé — nếu nhân hoá HUSSIO thành một người đàn ông, anh/chị nghĩ người đó sẽ như thế nào?",
    o:[["Người đàn ông hiện đại, chỉn chu và thực tế","Người đàn ông hiện đại, chỉn chu và thực tế"],["Người đàn ông trẻ trung, cởi mở và tràn đầy năng lượng","Người đàn ông trẻ trung, cởi mở và tràn đầy năng lượng"],["Người đàn ông chững chạc, điềm đạm và lịch lãm","Người đàn ông chững chạc, điềm đạm và lịch lãm"],["Người đàn ông tinh tế, có gu thẩm mỹ cao","Người đàn ông tinh tế, có gu thẩm mỹ cao"]] },
  { e:"entry.705790333", t:"Anh/chị thường mặc sản phẩm của HUSSIO vào những dịp nào?",
    o:[["Đi làm","Đi Làm"],["Đi tiệc","Đi Tiệc"],["Đi cafe, đi chơi với bạn bè, người yêu","Đi cafe, đi chơi với bạn bè, người yêu"],["Cả 3 dịp trên","Cả 3 dịp trên"]] },
  { e:"entry.1763782315", t:"Anh/chị quan tâm đến yếu tố nào khi quyết định mua sản phẩm?",
    o:[["Thiết kế – Kiểu dáng phù hợp","Thiết kế - Kiểu dáng phù hợp"],["Chất liệu và độ hoàn thiện sản phẩm cao","Chất liệu và độ hoàn thiện sản phẩm cao"],["Giá thành hợp lí","Giá thành hợp lí"],["Tính ứng dụng cao – mặc được nhiều dịp","Tính ứng dụng cao - mặc được nhiều dịp"]] },
  { e:"entry.1296764762", t:"Yếu tố nào ở HUSSIO khiến anh/chị yêu thích hoặc ấn tượng nhất?",
    o:[["Form dáng dễ mặc và ứng dụng cao","Form dáng dễ mặc và ứng dụng cao"],["Chất liệu đẹp, chất lượng sản phẩm tốt","Chất liệu đẹp, chất lượng sản phẩm tốt"],["Giá cả phù hợp","Giá cả phù hợp"],["Hình ảnh thương hiệu chỉn chu","Hình ảnh thương hiệu chỉn chu"],["Sự khác biệt so với các brand cùng phân khúc","Sự khác biệt so với các brand cùng phân khúc"]] },
  { e:"entry.1840612361", t:"Yếu tố nào khiến anh/chị cảm thấy “kết nối” với một thương hiệu thời trang?",
    o:[["Phong cách đúng với gu cá nhân","Phong cách đúng với gu cá nhân"],["Sự đồng nhất từ sản phẩm đến truyền thông","Sự đồng nhất từ sản phẩm đến truyền thông"],["Giá trị và tinh thần thương hiệu phù hợp với bản thân","Giá trị và tinh thần thương hiệu phù hợp với bản thân"],["Sản phẩm mang lại cảm giác tự tin khi mặc","Sản phẩm mang lại cảm giác tự tin khi mặc"],["Chất lượng và trải nghiệm sản phẩm tốt","Chất lượng và trải nghiệm sản phẩm tốt"]] },
  { e:"entry.1669516331", t:"Anh/chị thường có xu hướng thích thương hiệu như thế nào?",
    o:[["Liên tục cập nhật trend mới và tạo cảm giác mới mẻ","Liên tục cập nhật trend mới và tạo cảm giác mới mẻ"],["Có phong cách thương hiệu rõ ràng, phù hợp với hình tượng của bản thân","Có phong cách thương hiệu rõ ràng, phù hợp với hình tượng của bản thân"],["Kết hợp giữa tính thời trang và bản sắc riêng thương hiệu","Kết hợp giữa tính thời trang và bản sắc riêng thương hiệu"]] },
  { e:"entry.1258641336", t:"Anh/chị có quan tâm những bộ sưu tập có câu chuyện và cảm hứng văn hoá không?",
    o:[["Rất quan tâm","Rất quan tâm"],["Có, nếu được làm theo hướng hiện đại","Có, nếu được làm theo hướng hiện đại"],["Có nhưng không phải yếu tố quyết định","Có nhưng không phải yếu tố quyết định"],["Ít quan tâm","ít quan tâm"]] },
  { e:"entry.884795961", t:"Theo anh/chị, thời trang nam Việt Nam hiện tại còn <strong>thiếu</strong> điều gì nhất?",
    o:[["Bản sắc và dấu ấn riêng của thương hiệu","Bản sắc và dấu ấn riêng của thương hiệu"],["Tính ứng dụng trong đời sống hằng ngày","Tính ứng dụng trong đời sống hằng ngày"],["Các thương hiệu có phong cách rõ ràng","Các thương hiệu có phong cách rõ ràng"],["Chất lượng tương xứng giá tiền","Chất lượng tương xứng giá tiền"],["Sự kết nối với văn hoá Việt theo cách hiện đại","Sự kết nối với văn hoá Việt theo cách hiện đại"]] }
];

const form = document.getElementById('form');
QUESTIONS.forEach((q, i) => {
  const sec = document.createElement('section');
  sec.className = 'q-section';
  const num = String(i + 1).padStart(2, '0');
  let opts = '';
  q.o.forEach((opt) => {
    const label = opt[0], value = opt[1];
    opts += `<label class="option">
      <input type="radio" name="q${i}" value="${value.replace(/"/g,'&quot;')}">
      <span class="radio"></span>
      <span class="opt-text">${label}</span>
    </label>`;
  });
  sec.innerHTML = `<div class="q-inner" data-q="${i}">
      <div class="q-head"><span class="q-num">${num}</span><span class="q-req">Bắt buộc</span></div>
      <h2 class="q-title">${q.t}</h2>
      <div class="options" role="radiogroup" aria-label="Câu ${num}">${opts}</div>
      <p class="q-error">Vui lòng chọn một đáp án để tiếp tục.</p>
    </div>`;
  form.appendChild(sec);
});

const total = QUESTIONS.length;
const hcount = document.getElementById('hcount');
const fcount = document.getElementById('fcount');
const bar = document.getElementById('bar');

function answeredCount() {
  let n = 0;
  for (let i = 0; i < total; i++) if (document.querySelector(`input[name="q${i}"]:checked`)) n++;
  return n;
}

function refresh() {
  const n = answeredCount();
  hcount.textContent = n;
  fcount.textContent = n;
  bar.style.width = (n / total * 100) + '%';
}

form.addEventListener('change', (e) => {
  if (e.target.matches('input[type=radio]')) {
    const group = e.target.closest('.options');
    group.querySelectorAll('.option').forEach(l => l.classList.remove('is-checked'));
    e.target.closest('.option').classList.add('is-checked');
    const inner = e.target.closest('.q-inner');
    inner.classList.remove('err');
    refresh();
    const idx = parseInt(inner.dataset.q, 10);
    const next = document.querySelector(`.q-inner[data-q="${idx + 1}"]`);
    setTimeout(() => {
      if (next) {
        next.closest('.q-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        document.querySelector('.finish').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 280);
  }
});

// reveal on scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('in'); });
}, { threshold: .18 });
document.querySelectorAll('.q-inner').forEach(el => io.observe(el));

// sticky header after hero
const topbar = document.getElementById('topbar');
new IntersectionObserver(([e]) => {
  topbar.classList.toggle('show', !e.isIntersecting);
}, { threshold: 0 }).observe(document.querySelector('.hero'));

// start button + bấm vào banner
function startSurvey(e) {
  if (e) e.preventDefault();
  document.querySelector('.q-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
document.getElementById('startBtn').addEventListener('click', startSurvey);
document.getElementById('heroBanner').addEventListener('click', startSurvey);

function collect() {
  return QUESTIONS.map((q, i) => {
    const sel = document.querySelector(`input[name="q${i}"]:checked`);
    return { q: q.t.replace(/<[^>]+>/g, ''), a: sel ? sel.value : null };
  });
}

const submitBtn = document.getElementById('submitBtn');
const phoneInput = document.getElementById('phone');
const phoneErr = document.getElementById('phoneErr');

// SĐT di động VN về dạng 0xxxxxxxxx; sai định dạng trả "". Giống normalizePhone_ trong Apps Script.
function normalizePhone(s) {
  s = String(s || '').replace(/[\s.\-()]/g, '');
  if (s.startsWith('+84')) s = '0' + s.slice(3);
  else if (s.startsWith('84') && s.length === 11) s = '0' + s.slice(2);
  return /^0[35789]\d{8}$/.test(s) ? s : '';
}

function showPhoneError(msg) {
  phoneErr.textContent = msg;
  phoneErr.hidden = false;
  phoneInput.classList.add('err');
  phoneInput.focus();
  phoneInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

phoneInput.addEventListener('input', () => {
  phoneErr.hidden = true;
  phoneInput.classList.remove('err');
});
phoneInput.addEventListener('focus', () => warmUp());

function savedClaim() {
  try { return JSON.parse(localStorage.getItem(CLAIM_KEY) || 'null'); } catch { return null; }
}

// mã ngẫu nhiên của máy này: gửi lại cùng SĐT từ cùng máy thì API trả lại đúng mã cũ (thử lại an toàn khi mạng rớt)
function deviceToken() {
  let t = null;
  try { t = localStorage.getItem(TOKEN_KEY); } catch {}
  if (!t) {
    t = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
    try { localStorage.setItem(TOKEN_KEY, t); } catch {}
  }
  window._deviceToken = window._deviceToken || t;
  return window._deviceToken;
}

// đánh thức API sớm để lúc khách bấm gửi không phải chờ máy chủ khởi động (không đọc kho)
let lastWarm = 0;
function warmUp() {
  if (!VOUCHER.claimUrl || Date.now() - lastWarm < 60000) return;
  lastWarm = Date.now();
  fetch(VOUCHER.claimUrl + '?ping=1').catch(() => {});
}

async function claimOnce(phone) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    // body chuỗi → Content-Type text/plain, không phát sinh preflight CORS
    const res = await fetch(VOUCHER.claimUrl, { method: 'POST', body: JSON.stringify({ phone, token: deviceToken() }), signal: ctrl.signal });
    if (!res.ok) return { ok: false, error: 'network' };
    return await res.json();
  } catch {
    return { ok: false, error: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

// mạng yếu: thử tối đa 3 lần; các lỗi có nghĩa (SĐT sai, đã nhận, hết mã...) trả về ngay
async function claimVoucher(phone) {
  if (!VOUCHER.claimUrl) return { ok: false, error: 'offline' };
  let r;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      submitBtn.textContent = 'Mạng chậm, đang thử lại...';
      await new Promise(res => setTimeout(res, attempt * 1500));
    }
    r = await claimOnce(phone);
    if (r.ok || (r.error !== 'network' && r.error !== 'busy')) return r;
  }
  return r;
}

submitBtn.addEventListener('click', async () => {
  let firstMissing = null;
  for (let i = 0; i < total; i++) {
    const inner = document.querySelector(`.q-inner[data-q="${i}"]`);
    if (!document.querySelector(`input[name="q${i}"]:checked`)) {
      inner.classList.add('err');
      if (firstMissing === null) firstMissing = inner;
    } else {
      inner.classList.remove('err');
    }
  }
  if (firstMissing) {
    firstMissing.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const phone = normalizePhone(phoneInput.value);
  if (!phone) {
    showPhoneError('Số điện thoại chưa đúng, anh/chị kiểm tra lại giúp HUSSIO nhé.');
    return;
  }
  window._answers = collect();

  // thiết bị này đã nhận mã: hiện lại mã cũ, không gửi thêm phản hồi
  const saved = savedClaim();
  if (saved && saved.code) {
    showThanks('again', saved.code);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Đang tạo mã voucher...';
  const r = await claimVoucher(phone);
  submitBtn.disabled = false;
  submitBtn.textContent = 'Gửi & nhận voucher';

  if (r.ok && r.code) {
    try { localStorage.setItem(CLAIM_KEY, JSON.stringify({ code: r.code, phone })); } catch {}
    // SĐT đã nhận từ máy khác: hiện lại đúng mã cũ, không gửi phản hồi khảo sát trùng
    const reused = r.again && !r.sameDevice;
    if (!reused) sendToGoogle();
    showThanks(reused ? 'used' : 'ok', r.code);
  } else if (r.error === 'phone') {
    showPhoneError('Số điện thoại chưa đúng, anh/chị kiểm tra lại giúp HUSSIO nhé.');
  } else if (r.error === 'soldout' || r.error === 'ended') {
    sendToGoogle();
    showThanks('soldout');
  } else {
    // mạng lỗi: vẫn ghi phản hồi; máy chủ có thể đã phát mã, nút "Thử lại lấy mã" lấy lại bằng token của máy này
    sendToGoogle();
    pendingPhone = phone;
    showThanks('fallback');
  }
});

let pendingPhone = '';
const retryBtn = document.getElementById('retryBtn');
retryBtn.addEventListener('click', async () => {
  if (!pendingPhone) return;
  retryBtn.disabled = true;
  retryBtn.textContent = 'Đang lấy mã...';
  const r = await claimVoucher(pendingPhone);
  retryBtn.disabled = false;
  retryBtn.textContent = 'Thử lại lấy mã';
  if (r.ok && r.code) {
    try { localStorage.setItem(CLAIM_KEY, JSON.stringify({ code: r.code, phone: pendingPhone })); } catch {}
    pendingPhone = '';
    showThanks('ok', r.code);
    document.getElementById('thanks').scrollTop = 0;
  } else if (r.error === 'soldout' || r.error === 'ended') {
    pendingPhone = '';
    showThanks('soldout');
  } else {
    retryBtn.textContent = 'Mạng vẫn lỗi, bấm thử lại';
  }
});

function sendToGoogle() {
  try {
    const f = document.createElement('form');
    f.action = GFORM; f.method = 'POST'; f.target = 'gform_sink'; f.style.display = 'none';
    QUESTIONS.forEach((q, i) => {
      const sel = document.querySelector(`input[name="q${i}"]:checked`);
      if (sel) {
        const inp = document.createElement('input');
        inp.type = 'hidden'; inp.name = q.e; inp.value = sel.value;
        f.appendChild(inp);
      }
    });
    document.body.appendChild(f);
    f.submit();
    setTimeout(() => f.remove(), 2000);
  } catch (err) { /* silent fail — user vẫn thấy màn cảm ơn */ }
}

refresh();
warmUp();

// màn cảm ơn theo kết quả phát mã (ok/again/used đều có mã):
// ok = vừa nhận; again = máy này đã nhận; used = SĐT đã nhận ở máy khác, hiện lại mã cũ;
// soldout = hết mã hoặc hết hạn; fallback = lỗi mạng, có nút "Thử lại lấy mã" và Zalo
const THANKS_DESC = {
  ok: 'Phản hồi đã được ghi nhận — voucher <strong>giảm 20%</strong> là lời cảm ơn của HUSSIO dành cho anh/chị.',
  again: 'Thiết bị này đã nhận voucher <strong>giảm 20%</strong>. Đây là mã của anh/chị.',
  used: 'Số điện thoại này đã nhận voucher <strong>giảm 20%</strong> trước đó. Đây là mã của anh/chị.',
  soldout: 'Cảm ơn anh/chị đã góp ý! HUSSIO đã phát hết voucher của chương trình lần này.',
  fallback: 'Phản hồi đã được ghi nhận. Mạng đang chập chờn nên chưa tải được mã voucher <strong>giảm 20%</strong>, anh/chị bấm "Thử lại lấy mã" nhé.'
};

function showThanks(state, code) {
  const hasCode = Boolean(code);
  document.getElementById('thanksDesc').innerHTML = THANKS_DESC[state];
  document.getElementById('thanksBanner').hidden = state === 'soldout';
  document.querySelector('.vopt-now').hidden = !hasCode;
  document.querySelector('.vopt-sep').hidden = !hasCode;
  document.querySelector('.vopt-later').hidden = state === 'soldout';
  document.getElementById('captureBtn').hidden = !hasCode;
  retryBtn.hidden = !(state === 'fallback' && pendingPhone);
  document.getElementById('laterTitle').textContent = hasCode
    ? 'Chưa mua ngay? Lưu lại để dùng sau'
    : 'Chưa lấy được mã?';
  document.getElementById('laterSub').textContent = hasCode
    ? 'Chụp màn hình trang này để giữ mã. Cần hỗ trợ, anh/chị nhắn Zalo HUSSIO, CSKH sẽ gửi lại link voucher.'
    : 'Bấm "Thử lại lấy mã". Vẫn chưa được thì nhắn Zalo HUSSIO kèm số điện thoại vừa nhập, CSKH sẽ gửi mã cho anh/chị.';
  if (hasCode) {
    document.getElementById('vCode').textContent = code;
    document.querySelector('.btn-use-now').href = VOUCHER.linkBase + encodeURIComponent(code);
  }
  const hint = document.querySelector('.thanks-hint');
  hint.textContent = VOUCHER.note;
  hint.hidden = !hasCode;
  document.getElementById('thanks').classList.add('show');
  document.body.style.overflow = 'hidden';
}

document.getElementById('copyBtn').addEventListener('click', async () => {
  const btn = document.getElementById('copyBtn');
  const code = document.getElementById('vCode').textContent;
  try {
    await navigator.clipboard.writeText(code);
  } catch {
    const r = document.createRange();
    r.selectNodeContents(document.getElementById('vCode'));
    getSelection().removeAllRanges();
    getSelection().addRange(r);
    document.execCommand('copy');
  }
  btn.textContent = 'Đã chép';
  btn.classList.add('copied');
  setTimeout(() => { btn.textContent = 'Sao chép'; btn.classList.remove('copied'); }, 1800);
});

// screenshot button
document.getElementById('captureBtn').addEventListener('click', async () => {
  const btn = document.getElementById('captureBtn');
  const inner = document.querySelector('.thanks-inner');
  btn.disabled = true;
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" stroke-dasharray="4 3"/></svg> Đang chụp...`;

  try {
    const canvas = await html2canvas(inner, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#EDEEF1',
      logging: false,
      ignoreElements: el => el.id === 'captureBtn'
    });

    const url = canvas.toDataURL('image/png');

    // chỉ dùng Web Share API trên mobile thật (Android/iOS)
    const isRealMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isRealMobile && navigator.share && navigator.canShare) {
      canvas.toBlob(async (blob) => {
        try {
          const file = new File([blob], 'hussio-voucher-20.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'HUSSIO Voucher 20%' });
            return;
          }
        } catch {}
        triggerDownload(url);
      });
    } else {
      triggerDownload(url);
    }
  } catch {
    alert('Không thể chụp tự động. Vui lòng chụp màn hình thủ công rồi gửi Zalo HUSSIO nhé!');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.8"/><path d="M9 5l1.5-2h3L15 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Lưu ảnh màn hình`;
  }
});

function triggerDownload(url) {
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hussio-voucher-20.png';
  a.click();
}
