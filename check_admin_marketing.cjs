const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  // Set local storage for admin_token to bypass login
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    localStorage.setItem('admin_token', 'fake-token');
  });

  await page.goto('http://localhost:3000/admin/marketing', { waitUntil: 'networkidle2' });
  const content = await page.content();
  console.log("CONTENT LENGTH:", content.length);
  
  await browser.close();
})();
