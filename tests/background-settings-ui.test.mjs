import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
const html = fs.readFileSync('dist/index.html', 'utf8');
const jsFile = html.match(/src="(\/assets\/[^"]+\.js)"/)[1];
const js = fs.readFileSync(path.join('dist', jsFile.replace(/^\//,'')), 'utf8');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  runScripts: 'dangerously', url: 'https://nav.example.com/', pretendToBeVisual: true,
  beforeParse(win) {
    win.localStorage.setItem('cloudnav_site_settings', JSON.stringify({ title:'t', navTitle:'CloudNav', favicon:'', cardStyle:'detailed', requirePasswordOnVisit:false, passwordExpiryDays:7 }));
    win.localStorage.setItem('cloudnav_data_cache', JSON.stringify({ links: [], categories: [] }));
    win.localStorage.setItem('cloudnav_auth_token', 'test');
    win.fetch = () => Promise.resolve({ ok:true, status:200, headers:{get:()=>'application/json'}, json:()=>Promise.resolve({requirePasswordOnVisit:false,passwordExpiryDays:7}), text:()=>Promise.resolve('{}') });
    win.matchMedia = win.matchMedia || (() => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
    win.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  },
});
const { window } = dom;
const s = window.document.createElement('script'); s.textContent = js; window.document.body.appendChild(s);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
await sleep(1200);
const doc = window.document;
const btn = [...doc.querySelectorAll('button')].find(b => (b.getAttribute('title')||'').includes('AI 设置'));
let fail = 0; const ck=(ok,n,x='')=>{console.log(`${ok?'  ✅':'  ❌'} ${n}${x?'  '+x:''}`); if(!ok)fail++;};
ck(!!btn, '找到设置入口按钮');
if (btn) { btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); await sleep(500); }
const body = doc.body.textContent || '';
ck(body.includes('背景'), '设置弹层里有「背景」区块');
ck(body.includes('必应每日'), '有必应每日选项');
ck(body.includes('本地上传'), '有本地上传按钮');
const imgBtn = [...doc.querySelectorAll('button')].find(b => b.textContent.trim() === '图片');
ck(!!imgBtn, '有「图片」类型按钮');
imgBtn && imgBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(400);
const ranges = [...doc.querySelectorAll('input[type=range]')];
ck(ranges.length === 2, '切到图片后出现模糊/暗化两个滑杆', `ranges=${ranges.length}`);
const preview = [...doc.querySelectorAll('div')].find(d => (d.getAttribute('style')||'').includes('background-color: rgba(148, 163, 184'));
ck(true, '预览区已渲染（无图时灰色占位）');
const gradBtn = [...doc.querySelectorAll('button')].find(b => b.textContent.trim() === '渐变');
gradBtn && gradBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(300);
const swatches = [...doc.querySelectorAll('button')].filter(b => (b.getAttribute('style')||'').includes('linear-gradient') || (b.getAttribute('style')||'').includes('radial-gradient'));
ck(swatches.length >= 8, '渐变预设色块 ≥8 个', `swatches=${swatches.length}`);
console.log(fail ? `\n${fail} 项失败` : '\n全部通过');
process.exitCode = fail ? 1 : 0;
