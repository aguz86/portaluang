const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  let requestCount = 0;
  page.on('request', () => requestCount++);
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
  console.log('Total requests made:', requestCount);
  await browser.close();
})();
