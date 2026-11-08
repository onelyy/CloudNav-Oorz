/**
 * 保存链路 E2E：登录 → 改背景 → 保存 → 刷新 → 背景还在
 *
 * 用一个本地 mock 服务模拟 Cloudflare Functions 的鉴权与 KV 语义（含 website GET 的 Cache-Control），
 * 专门验证两件事：
 *   1. P0 加鉴权之后，客户端保存站点配置还能通过（x-auth-password 是对的）
 *   2. website 配置被浏览器缓存 60s 之后，刷新页面不会把刚存的背景冲掉
 *
 * 跑法：npm run test:save
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PASSWORD = 'test-pw';
// 模拟 Cloudflare Pages Preview 环境：默认不配 PASSWORD，此时保存不应该被拦
const NO_PASSWORD = process.env.MOCK_NO_PASSWORD === '1';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

// 内存 KV
const KV = {
  website_config: JSON.stringify({ title: '测试站', navTitle: 'CloudNav', favicon: '', cardStyle: 'detailed', requirePasswordOnVisit: false, passwordExpiryDays: 7 }),
  app_data: JSON.stringify({ links: [{ id: '1', title: 'GitHub', url: 'https://github.com', categoryId: 'dev', createdAt: 1 }], categories: [{ id: 'dev', name: '开发工具', icon: 'Code' }] }),
};
let lastSaveStatus = 0;

const readBody = (req) => new Promise((r) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => r(b)); });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const send = (code, body, headers = {}) => { res.writeHead(code, { 'Content-Type': 'application/json', ...headers }); res.end(body); };

  if (url.pathname === '/api/storage') {
    const authed = NO_PASSWORD ? true : req.headers['x-auth-password'] === PASSWORD;
    if (req.method === 'GET') {
      const cfg = url.searchParams.get('getConfig');
      if (cfg === 'website') {
        return send(200, KV.website_config, { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' });
      }
      if (!authed) return send(401, JSON.stringify({ error: 'Unauthorized' }));
      return send(200, KV.app_data);
    }
    const body = JSON.parse((await readBody(req)) || '{}');
    if (body.authOnly) return authed ? send(200, JSON.stringify({ ok: true })) : send(401, JSON.stringify({ error: 'Unauthorized' }));
    if (body.saveConfig === 'website') {
      // 与 functions/api/storage.ts 的 P0 逻辑一致：必须登录
      lastSaveStatus = authed ? 200 : 401;
      if (!authed) return send(401, JSON.stringify({ error: 'Unauthorized' }));
      KV.website_config = JSON.stringify(body.config);
      return send(200, JSON.stringify({ success: true }));
    }
    if (!authed) return send(401, JSON.stringify({ error: 'Unauthorized' }));
    return send(200, JSON.stringify({ success: true }));
  }

  const file = path.join(DIST, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4180, '127.0.0.1', r));

let fail = 0;
const ck = (ok, name, extra = '') => { console.log(`${ok ? '  ✅' : '  ❌'} ${name}${extra ? '  ' + extra : ''}`); if (!ok) fail++; };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));

// 预置登录态（等价于已经输过密码；云端存的是密码本身）
await page.addInitScript((pw) => {
  localStorage.setItem('cloudnav_auth_token', pw);
  localStorage.setItem('lastLoginTime', String(Date.now()));
}, PASSWORD);

await page.goto('http://127.0.0.1:4180/', { waitUntil: 'load' });
await page.waitForTimeout(1200);
ck(true, NO_PASSWORD ? '预览环境（无 PASSWORD）模式' : '正式环境（有 PASSWORD）模式');

/* 2. 打开设置 → 背景 → 图片 → 填 URL → 保存 */
await page.click('button[title="AI 设置"]');
await page.waitForTimeout(700);
await page.getByRole('button', { name: '图片', exact: true }).first().click();
await page.waitForTimeout(200);
await page.locator('input[placeholder*="example.com/bg"]').first().fill('https://example.com/saved.jpg');
await page.getByRole('button', { name: /保存更改/ }).first().click();
await page.waitForTimeout(1200);
ck(lastSaveStatus === 200, '保存站点配置返回 200（带鉴权也通过）', `status=${lastSaveStatus}`);

const kvHasBg = JSON.parse(KV.website_config).background?.imageUrl;
ck(kvHasBg === 'https://example.com/saved.jpg', 'KV 里写进了背景 URL', String(kvHasBg));

/* 3. 刷新（此时 website 配置在浏览器里还是 60s 缓存）→ 背景必须还在 */
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(1500);
const afterReload = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div[aria-hidden="true"]')].find((d) => (d.getAttribute('style') || '').includes('saved.jpg'));
  return el ? el.getAttribute('style') : null;
});
ck(!!afterReload, '刷新后背景仍然是刚才设置的图（没被 60s 缓存冲掉）', afterReload ? afterReload.slice(0, 60) : '');

ck(errs.length === 0, '无未捕获错误', errs.slice(0, 2).join(' | '));
await browser.close();
server.close();
console.log(fail ? `\n${fail} 项失败` : '\n全部通过');
process.exitCode = fail ? 1 : 0;
