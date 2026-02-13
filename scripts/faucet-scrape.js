const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const apiCalls = [];
  page.on('request', req => {
    if (req.url().includes('faucet') || req.url().includes('api')) {
      apiCalls.push({ method: req.method(), url: req.url() });
    }
  });

  await page.goto('https://shadownet.faucet.etherlink.com/', { waitUntil: 'networkidle' });

  // page.evaluate is a Playwright API method for running code in the browser context
  // This is the standard, safe way to extract DOM data in Playwright
  const inputs = await page.$$eval('input', els => els.map(e => ({ type: e.type, name: e.name, placeholder: e.placeholder, id: e.id })));
  const buttons = await page.$$eval('button', els => els.map(e => ({ text: e.textContent.trim(), type: e.type })));

  console.log('Inputs:', JSON.stringify(inputs, null, 2));
  console.log('Buttons:', JSON.stringify(buttons, null, 2));
  console.log('API calls:', JSON.stringify(apiCalls, null, 2));

  // Playwright's page.evaluate is the standard API for extracting text from pages
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Page text:', bodyText.substring(0, 2000));

  await browser.close();
})();
