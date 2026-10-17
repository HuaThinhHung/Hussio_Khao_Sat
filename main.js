// Google Form "Khảo Sát Hussio quý 2" (lần 2). Form phải được Xuất bản thì mới nhận câu trả lời.
const GFORM = "https://docs.google.com/forms/d/e/1FAIpQLSfE_xgdVbnWvxjSlitcAfenjT5IWHxxS0pesPKhIM2LYWbS_w/formResponse";

// Voucher cảm ơn. Điền link sau khi tạo mã giảm giá trên Shopify;
// để trống thì ẩn nút "Dùng voucher ngay", khách vẫn nhận qua Zalo.
const VOUCHER = {
  link: "",      // vd "https://hussio.com/discount/MA-GIAM-GIA"
  note: ""       // vd "Voucher có hiệu lực đến 31/12/2026 · Áp dụng cho đơn từ 250.000đ"
};

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

document.getElementById('submitBtn').addEventListener('click', () => {
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
  window._answers = collect();
  sendToGoogle();
  document.getElementById('thanks').classList.add('show');
  document.body.style.overflow = 'hidden';
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

// voucher cảm ơn: link dùng ngay + ghi chú hạn dùng lấy từ VOUCHER
if (VOUCHER.link) {
  document.querySelector('.btn-use-now').href = VOUCHER.link;
} else {
  document.querySelector('.vopt-now').hidden = true;
  document.querySelector('.vopt-sep').hidden = true;
}
const vHint = document.querySelector('.thanks-hint');
if (VOUCHER.note) vHint.textContent = VOUCHER.note; else vHint.hidden = true;

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
