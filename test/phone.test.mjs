import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizePhone } from '../api/_voucher.js';

// lấy đúng hàm normalizePhone trong main.js để chắc web và máy chủ chuẩn hoá giống nhau
const src = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
const body = src.match(/function normalizePhone\(s\) \{[\s\S]*?\n\}/)[0];
const webNormalize = new Function(body + '; return normalizePhone;')();

const cases = {
  '0982825284': '0982825284', '982825284': '0982825284', '+84982825284': '0982825284', '84982825284': '0982825284',
  '098 282 5284': '0982825284', '098.282.5284': '0982825284', '0382825284': '0382825284',
  '0182825284': '', '12345': '', '': '', '098282528': '', '09828252841': '', abc: '', '0482825284': ''
};

test('normalizePhone: các dạng SĐT về cùng 1 giá trị, số sai bị loại', () => {
  for (const [input, want] of Object.entries(cases)) assert.equal(normalizePhone(input), want, input);
});

test('normalizePhone: web và máy chủ cho kết quả giống hệt', () => {
  for (const input of Object.keys(cases)) assert.equal(webNormalize(input), normalizePhone(input), input);
});
