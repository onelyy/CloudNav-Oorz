import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

const html = fs.readFileSync('dist/index.html', 'utf8');
const jsFile = html.match(/src="(\/assets\/[^"]+\.js)"/)[1];
const js = fs.readFileSync(path.join('dist', jsFile.replace(/^\//,'')), 'utf8');

const settings = {
  title: 't', navTitle: 'CloudNav', favicon: '', cardStyle: 'detailed',
  requirePasswordOnVisit: false, passwordExpiryDays: 7,
  background: { type: 'image', color: '#000', gradient: 'linear-gradient(#000,#fff)', imageUrl: 'https://example.com/bg.jpg', blur: 8, dim: 30 },
};

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  runScripts: 'dangerously', url: 'https://nav.example.com/', pretendToBeVisual: true,
  beforeParse(win) {
    win.localStorage.setItem('cloudnav_site_settings', JSON.stringify(settings));
    win.localStorage.setItem('cloudnav_data_cache', JSON.stringify({ links: [], categories: [] }));
    win.fetch = (url) => Promise.resolve({
      ok: true, status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ requirePasswordOnVisit: false, passwordExpiryDays: 7 }),
      text: () => Promise.resolve('{}'),
    });
    win.matchMedia = win.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    win.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  },
});

const { window } = dom;
const errs = [];
window.addEventListener('error', (e) => errs.push(e.message));
const s = window.document.createElement('script');
s.textContent = js;
window.document.body.appendChild(s);

await new Promise((r) => setTimeout(r, 1500));
const doc = window.document;
const layers = [...doc.querySelectorAll('div[aria-hidden="true"]')];
const bgLayer = layers.find((d) => (d.getAttribute('style') || '').includes('bg.jpg'));
const dimLayer = layers.find((d) => (d.getAttribute('style') || '').includes('rgba(2, 6, 23'));
let fail = 0;
const ck = (ok, name, extra='') => { console.log(`${ok ? '  ✅' : '  ❌'} ${name}${extra ? '  ' + extra : ''}`); if(!ok) fail++; };
ck(!!bgLayer, '图片背景层已渲染');
ck(bgLayer && bgLayer.getAttribute('style').includes('cover'), '背景是 cover 铺满');
ck(bgLayer && /blur\(8px\)/.test(bgLayer.getAttribute('style')), '模糊 8px 生效', bgLayer?.getAttribute('style') || '');
ck(!!dimLayer, '暗化遮罩层已渲染', dimLayer?.getAttribute('style') || '');
ck(errs.length === 0, '无未捕获错误', errs.join(' | ').slice(0, 200));
console.log(fail ? `\n${fail} 项失败` : '\n全部通过');
process.exitCode = fail ? 1 : 0;
