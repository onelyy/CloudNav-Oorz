/**
 * 背景功能端到端测试（真实 Chromium）
 *
 * 为什么不用 jsdom：打包后是多个 ES module chunk，jsdom 不执行 type=module 脚本。
 * 这里起一个静态服务器 + Playwright，跑真浏览器，能覆盖「背景层真的画出来」「设置面板能点」「上传能转成 dataURL」。
 *
 * 跑法：npm run test:bg
 * 首次需要：npx playwright install chromium
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

const settings = {
  title: '云航测试', navTitle: 'CloudNav', favicon: '', cardStyle: 'detailed',
  requirePasswordOnVisit: false, passwordExpiryDays: 7,
  background: { type: 'image', color: '#0f172a', gradient: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', imageUrl: 'https://example.com/bg.jpg', blur: 8, dim: 30 },
};

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const file = path.join(DIST, url === '/' ? 'index.html' : url);
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4179, '127.0.0.1', r));

let fail = 0;
const ck = (ok, name, extra = '') => { console.log(`${ok ? '  ✅' : '  ❌'} ${name}${extra ? '  ' + extra : ''}`); if (!ok) fail++; };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));

// 预置站点配置 + 已登录 + 一些链接
await page.addInitScript((s) => {
  localStorage.setItem('cloudnav_site_settings', JSON.stringify(s));
  localStorage.setItem('cloudnav_auth_token', 'test-token');
  localStorage.setItem('lastLoginTime', String(Date.now()));
  localStorage.setItem('cloudnav_data_cache', JSON.stringify({
    links: [{ id: '1', title: 'GitHub', url: 'https://github.com', categoryId: 'dev', createdAt: 1, description: '代码托管', pinned: true }],
    categories: [{ id: 'dev', name: '开发工具', icon: 'Code' }],
  }));
  const json = (o) => Promise.resolve(new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  window.fetch = (u) => {
    const u2 = String(u);
    if (u2.includes('getConfig=website')) return json(s);
    if (u2.includes('/api/storage')) return json({ success: true });
    return json({});
  };
}, settings);

await page.goto('http://127.0.0.1:4179/', { waitUntil: 'load' });
await page.waitForTimeout(1200);

/* 1. 背景层真的渲染出来 */
const layer = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div[aria-hidden="true"]')].find((d) => (d.getAttribute('style') || '').includes('bg.jpg'));
  return el ? el.getAttribute('style') : null;
});
ck(!!layer, '背景图层已渲染');
ck(!!layer && layer.includes('cover'), '背景 cover 铺满');
ck(!!layer && /blur\(8px\)/.test(layer), '模糊 8px 生效');
ck(await page.evaluate(() => [...document.querySelectorAll('div[aria-hidden="true"]')].some((d) => (d.getAttribute('style') || '').includes('rgba(2, 6, 23'))), '暗化遮罩已渲染');

/* 2. 设置面板：背景区块与控件 */
await page.click('button[title="AI 设置"]');
await page.waitForTimeout(700);
const body = await page.textContent('body');
ck(body.includes('背景'), '设置里有「背景」区块');
ck(body.includes('必应每日'), '有必应每日选项');
ck(body.includes('本地上传'), '有本地上传按钮');

await page.getByRole('button', { name: '渐变', exact: true }).first().click();
await page.waitForTimeout(300);
const swatches = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /linear-gradient|radial-gradient/.test(b.getAttribute('style') || '')).length);
ck(swatches >= 8, '渐变预设至少 8 个', `swatches=${swatches}`);

/* 3. 本地上传 → 压缩成 dataURL → 保存 */
await page.getByRole('button', { name: '图片', exact: true }).first().click();
await page.waitForTimeout(200);
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64');
const tmp = path.join(ROOT, 'tests', '_upload.png');
fs.writeFileSync(tmp, png);
const [chooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  page.getByRole('button', { name: /本地上传/ }).last().click(),
]);
await chooser.setFiles(tmp);
await page.waitForTimeout(1200);
await page.getByRole('button', { name: /保存更改/ }).first().click();
await page.waitForTimeout(1000);
const saved = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('cloudnav_site_settings') || '{}');
  return { type: s.background && s.background.type, prefix: String((s.background && s.background.imageUrl) || '').slice(0, 22) };
});
fs.unlinkSync(tmp);
ck(saved.type === 'image', '保存后 background.type = image');
ck(saved.prefix.startsWith('data:image/'), '上传的图片转成了 dataURL', saved.prefix);

/* 4. 没有未捕获错误 */
ck(errs.length === 0, '页面无未捕获错误', errs.slice(0, 2).join(' | '));

await browser.close();
server.close();
console.log(fail ? `\n${fail} 项失败` : '\n全部通过');
process.exitCode = fail ? 1 : 0;
