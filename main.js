const GFORM = "https://docs.google.com/forms/d/e/1FAIpQLSf-vTIHm8Tuza19WJP8gepTpeq8fDWfRewFy-4g2vitMUXwNQ/formResponse";

const QUESTIONS = [
  { e:"entry.1205774175", t:"Trước tiên cho HUSSIO làm quen chút nha — anh/chị đang ở nhóm tuổi nào ạ?",
    o:[["Dưới 22 tuổi","Dưới 22 tuổi"],["Từ 22 – 27 tuổi","từ 22 - 27 tuổi"],["Từ 28 – 35 tuổi","từ 28 - 35 tuổi"],["Trên 35 tuổi","Trên 35 tuổi"]] },
  { e:"entry.950424376", t:"Anh/chị đã sử dụng sản phẩm của HUSSIO bao lâu rồi ạ?",
    o:[["Dưới 6 tháng","Dưới 6 tháng"],["Dưới 1 năm","Dưới 1 năm"],["Trên 1 năm","Trên 1 năm"],["Trên 3 năm","Trên 3 năm"]] },
  { e:"entry.566680951", t:"Theo anh/chị, HUSSIO đang đại diện cho hình ảnh nào nhất?",
    o:[["Hiện đại và dễ ứng dụng","Hiện đại và dễ ứng dụng"],["Trẻ trung và năng động","Trẻ trung và năng động"],["Nam tính và trưởng thành","Nam tính và Trưởng thành"],["Thanh lịch và tối giản","Thanh lịch và tối giản"]] },
  { e:"entry.720087482", t:"Yếu tố nào khiến anh/chị quay lại mua sản phẩm của HUSSIO?",
    o:[["Form dáng mặc đẹp","Form dáng mặc đẹp"],["Chất lượng ổn định","Chất lượng ổn định"],["Phong cách rõ ràng","Phong cách rõ ràng"],["Giá thành phù hợp","Giá thành phù hợp"]] },
  { e:"entry.911577976", t:"Chơi nhỏ một chút nhé — nếu HUSSIO \"hoá thân\" thành một anh chàng ngoài đời, anh ấy sẽ là tuýp người nào?",
    o:[["Anh công sở chất chơi — đi làm mà cứ như đi sự kiện","Người đàn ông công sở hiện đại"],["Quý ông tối giản — ít nói, nhưng mặc gì cũng \"ăn tiền\"","Người đàn ông thanh lịch và tối giản"],["Người đàn ông điềm tĩnh, từng trải — nhìn là thấy đáng tin","Người đàn ông trưởng thành và điềm tĩnh"],["Soái ca có gu — nam tính và biết rõ mình muốn gì","Người đàn ông nam tính và có gu"]] },
  { e:"entry.705790333", t:"Anh/chị thường mặc sản phẩm của HUSSIO vào những dịp nào?",
    o:[["Đi làm","Đi Làm"],["Đi tiệc","Đi Tiệc"],["Đi cafe, đi chơi với bạn bè, người yêu","Đi cafe, đi chơi với bạn bè, người yêu"],["Cả 3 dịp trên","Cả 3 dịp trên"]] },
  { e:"entry.1763782315", t:"Anh/chị quan tâm đến yếu tố nào khi quyết định mua sản phẩm?",
    o:[["Thiết kế – Kiểu dáng phù hợp","Thiết kế - Kiểu dáng phù hợp"],["Chất liệu và độ hoàn thiện sản phẩm cao","Chất liệu và độ hoàn thiện sản phẩm cao"],["Giá thành phù hợp","Giá thành phù hợp"],["Tính ứng dụng cao","Tính ứng dụng cao"],["Câu chuyện sản phẩm rõ nét","Câu chuyện sản phẩm rõ nét"]] },
  { e:"entry.1296764762", t:"Yếu tố nào ở HUSSIO khiến anh/chị yêu thích hoặc ấn tượng nhất?",
    o:[["Form dáng dễ mặc và ứng dụng cao","Form dáng dễ mặc và ứng dụng cao"],["Chất liệu đẹp, chất lượng sản phẩm tốt","Chất liệu đẹp, chất lượng sản phẩm tốt"],["Giá cả phù hợp","Giá cả phù hợp"],["Hình ảnh thương hiệu chỉn chu","Hình ảnh thương hiệu chỉn chu"],["Sự khác biệt so với các brand cùng phân khúc","Sự khác biệt so với các brand cùng phân khúc"]] },
  { e:"entry.1840612361", t:"Yếu tố nào khiến anh/chị cảm thấy \"kết nối\" với một thương hiệu thời trang?",
    o:[["Phong cách đúng với gu cá nhân","Phong cách đúng với gu cá nhân"],["Sự đồng nhất từ sản phẩm đến truyền thông","Sự đồng nhất từ sản phẩm đến truyền thông"],["Giá trị và tinh thần thương hiệu phù hợp với bản thân","Giá trị và tinh thần thương hiệu phù hợp với bản thân"],["Sản phẩm mang lại cảm giác tự tin khi mặc","Sản phẩm mang lại cảm giác tự tin khi mặc"],["Chất lượng và trải nghiệm tốt","Chất lượng và trải nghiệm tốt"]] },
  { e:"entry.1669516331", t:"Anh/chị thường có xu hướng thích thương hiệu như thế nào?",
    o:[["Liên tục cập nhật trend mới và tạo cảm giác mới mẻ","Liên tục cập nhật trend mới và tạo cảm giác mới mẻ"],["Có phong cách thương hiệu rõ ràng, phù hợp với hình tượng của bản thân","Có phong cách thương hiệu rõ ràng, phù hợp với hình tượng của bản thân"],["Kết hợp giữa tính thời trang và bản sắc riêng thương hiệu","Kết hợp giữa tính thời trang và bản sắc riêng thương hiệu"]] },
  { e:"entry.1258641336", t:"Anh/chị có quan tâm những bộ sưu tập có câu chuyện và cảm hứng văn hoá không?",
    o:[["Rất quan tâm","Rất quan tâm"],["Có, nếu được làm theo hướng hiện đại","Có, nếu được làm theo hướng hiện đại"],["Có nhưng không phải yếu tố quyết định","Có nhưng không phải yếu tố quyết định"],["Ít quan tâm","ít quan tâm"]] },
  { e:"entry.884795961", t:"Câu cuối rồi, nói thẳng với HUSSIO nhé — anh/chị thấy thời trang nam Việt mình còn <strong>thiếu</strong> điều gì nhất?",
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

// start button
document.getElementById('startBtn').addEventListener('click', () => {
  document.querySelector('.q-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

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
