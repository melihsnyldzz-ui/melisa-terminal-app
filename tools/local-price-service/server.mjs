import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT || 8787);

const products = [
  { code: 'MB-1001', name: 'Bebek Takım', price: 485 },
  { code: 'MB-1002', name: 'Hastane Çıkışı', price: 620 },
  { code: 'MB-1003', name: 'Tulum', price: 295 },
  { code: 'MB-1004', name: 'Zıbın Seti', price: 210 },
  { code: 'MB-1005', name: 'Çocuk Elbise', price: 540 },
  { code: 'MB-1006', name: 'Kapitone Yelek', price: 390 },
  { code: 'MB-1007', name: 'Organik Body Set', price: 330 },
  { code: 'MB-1008', name: 'Kız Bebek Takım', price: 575 },
];

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(JSON.stringify(payload));
};

const server = http.createServer((request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    response.end();
    return;
  }

  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, { ok: true, service: 'local-price-service', mode: 'mock' });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/product-price') {
    const code = (url.searchParams.get('code') || '').trim().toUpperCase();

    if (!code) {
      sendJson(response, 400, { found: false, code: '', message: 'Ürün kodu eksik' });
      return;
    }

    const product = products.find((item) => item.code === code);

    if (!product) {
      sendJson(response, 404, { found: false, code, message: 'Ürün bulunamadı' });
      return;
    }

    sendJson(response, 200, { found: true, ...product });
    return;
  }

  sendJson(response, 404, { ok: false, message: 'Endpoint bulunamadı' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Local price service running at http://0.0.0.0:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Product: http://localhost:${PORT}/product-price?code=MB-1001`);
});
