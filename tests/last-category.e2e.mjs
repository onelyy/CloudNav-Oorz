/**
 * 「记住上次打开的目录」E2E
 *
 * 需求：上次停在 CESI 目录，关掉网页，下次打开还应该在 CESI，而不是回到「置顶网站」。
 * 另外要防两种坏情况：目录被删了、目录需要密码 —— 这两种应该退回「置顶网站」而不是卡死。
 *
 * 跑法：npm run test:category
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

const data = {
  links: [
    { id: '1', title: 'CESI 内网', url: 'https://example.com/cesi', categoryId: 'cesi', createdAt: 1, description: '内部系统' },
    { id: '2', title: 'GitHub', url: 'https://github.com', categoryId: 'dev', createdAt: 2, description: '代码托管' },
    { id: '3', title: '机密目录', url: 'https://example.com/secret', categoryId: 'secret', createdAt: 3 },
  ],
  categories: [
    { id: 'dev', name: '开发工具', icon: 'Code' },
    { id: 'cesi', name: 'CESI', icon: 'Building2' },
    { id: 'secret', name: '机密目录', icon: 'Lock', password: 'pw' },
  ],
};

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const file = path.join(DIST, url === '/' ? 'index.html' : url);
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4181, '127.0.0.1', r));

let fail = 0;
const ck = (ok, name, extra = '') => { console.log(`${ok ? '  ✅' : '  ❌'} ${name}${extra ? '  ' + extra : ''}`); if (!ok) fail++; };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));

const seed = async (lastCat = undefined) => {
  await page.addInitScript(({ d, pw, cat }) => {
    localStorage.setItem('cloudnav_data_cache', JSON.stringify(d));
    localStorage.setItem('cloudnav_auth_token', pw);
    localStorage.setItem('lastLoginTime', String(Date.now()));
    localStorage.setItem('cloudnav_site_settings', JSON.stringify({ title: 't', navTitle: 'CloudNav', favicon: '', cardStyle: 'detailed', requirePasswordOnVisit: false, passwordExpiryDays: 7 }));
    // 只有显式传字符串时才动这个 key（reload 会重跑脚本，不能顺手清掉）
    if (typeof cat === 'string') {
      if (cat) localStorage.setItem('cloudnav_last_category', cat);
      else localStorage.removeItem('cloudnav_last_category');
    }
  }, { d: data, pw: 'test', cat: lastCat });
};

/** 侧栏里高亮（当前选中）的那一项文字；'置顶网站' 或某个目录名 */
const activeNav = () => page.evaluate(() => {
  const aside = document.querySelector('aside');
  if (!aside) return null;
  const btn = [...aside.querySelectorAll('button')].find((b) => /bg-blue-50|bg-blue-100/.test(b.className || ''));
  return btn ? btn.textContent.trim() : null;
});
const h2Text = async () => ((await page.locator('main h2').count()) ? (await page.locator('main h2').first().textContent() || '') : '');

await seed();
await page.goto('http://127.0.0.1:4181/', { waitUntil: 'load' });
await page.waitForTimeout(1200);
ck((await activeNav()) === '置顶网站', '首次打开：默认停在「置顶网站」', String(await activeNav()));

/* 1. 点开 CESI → 关掉（刷新模拟重新打开）→ 还在 CESI */
await page.getByText('CESI', { exact: true }).first().click();
await page.waitForTimeout(600);
ck((await h2Text()).includes('CESI') && (await activeNav()) === 'CESI', '点击 CESI 后进入该目录', (await h2Text()).trim());
ck(await page.evaluate(() => localStorage.getItem('cloudnav_last_category')) === 'cesi', '目录 id 已写入 localStorage');

await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(1400);
ck((await h2Text()).includes('CESI') && (await activeNav()) === 'CESI', '刷新（=下次打开）后仍停在 CESI', (await h2Text()).trim());

/* 2. 目录被删掉 → 回到置顶网站 */
await page.evaluate(() => localStorage.setItem('cloudnav_last_category', 'deleted-cat'));
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(1400);
ck((await activeNav()) === '置顶网站', '上次的目录已不存在 → 退回「置顶网站」', String(await activeNav()));

/* 3. 目录需要密码 → 不自动进入，退回置顶网站 */
await page.evaluate(() => localStorage.setItem('cloudnav_last_category', 'secret'));
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(1400);
ck((await activeNav()) === '置顶网站', '上次的目录需要密码 → 不自动进入，退回置顶网站', String(await activeNav()));

ck(errs.length === 0, '无未捕获错误', errs.slice(0, 2).join(' | '));
await browser.close();
server.close();
console.log(fail ? `\n${fail} 项失败` : '\n全部通过');
process.exitCode = fail ? 1 : 0;
