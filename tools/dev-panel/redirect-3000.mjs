/**
 * redirect-3000.mjs - :3000 → website 别名重定向服务
 *
 * 将 localhost:3000 的所有请求 302 重定向到 website portal（默认 :3010）。
 * 仅用于本地开发，生产环境由 nginx 处理。
 */

import http from 'node:http';

const TARGET = (process.env.WEBSITE_URL ?? 'http://localhost:3010').replace(/\/+$/, '');

http.createServer((req, res) => {
  res.writeHead(302, { Location: `${TARGET}${req.url ?? '/'}` });
  res.end();
}).listen(3000, () => {
  console.log(`[website-alias] :3000 → ${TARGET}`);
});
