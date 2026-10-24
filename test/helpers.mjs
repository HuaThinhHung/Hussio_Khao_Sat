// kho giả lập Vercel Blob: create chỉ tạo 1 lần (giống allowOverwrite:false), có độ trễ ngẫu nhiên để lộ lỗi đồng thời
export function memoryKv() {
  const m = new Map();
  const tick = () => new Promise(r => setTimeout(r, Math.random() * 15));
  return {
    m,
    async get(p) { await tick(); return m.has(p) ? structuredClone(m.get(p)) : null; },
    async create(p, o) { await tick(); if (m.has(p)) return false; m.set(p, structuredClone(o)); return true; },
    async set(p, o) { await tick(); m.set(p, structuredClone(o)); },
    async list(pre) { return [...m.keys()].filter(k => k.startsWith(pre)); },
    async remove(p) { m.delete(p); }
  };
}

// Sheet giả lập: cột A có sẵn mã, ghi B/C theo mã; down = true thì ném lỗi như Google trả 401/503
export function memorySheet(codes) {
  const rows = new Map(codes.map(c => [c, { phone: '', time: '' }]));
  const s = {
    down: false, writes: 0, rows,
    async writeRows(list) {
      if (s.down) throw new Error('sheets 503 unavailable');
      s.writes++;
      const done = [], missing = [];
      for (const r of list) {
        if (!rows.has(r.code)) { missing.push(r.code); continue; }
        rows.set(r.code, { phone: r.phone, time: r.at });
        done.push(r.code);
      }
      return { done, missing };
    }
  };
  return s;
}
