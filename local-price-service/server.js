const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);

const demoProducts = new Map([
  [
    'MB-1001',
    {
      code: 'MB-1001',
      name: 'Bebek Takım',
      price: 485,
    },
  ],
]);

app.use(cors());
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'melisa-terminal-price-service',
  });
});

app.get('/product-price', (request, response) => {
  const code = String(request.query.code || '').trim().toUpperCase();
  const product = demoProducts.get(code);

  if (!product) {
    response.json({
      found: false,
      code,
      message: 'Ürün bulunamadı',
    });
    return;
  }

  response.json({
    found: true,
    code: product.code,
    name: product.name,
    price: product.price,
  });
});

app.listen(port, () => {
  console.log(`melisa-terminal-price-service listening on port ${port}`);
});
