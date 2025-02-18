import { chromium } from "playwright";
import 'dotenv/config';

async function runAutomation() {
  let browser;
  let page;

  try {
    browser = await chromium.launch({
      headless: false,
      slowMo: 100,
      args: [
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
      ],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
    });

    page = await context.newPage();

    const url = process.env.SITE_URL || 'https://store.bender-inc.com/DSF/SmartStore.aspx#!/Storefront';
    console.log('Navigating to:', url);

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForSelector('div.myaccount-link', { state: 'visible' });
    await page.click('div.myaccount-link');

    const title = await page.title();
    const links = await page.$$eval('a', anchors => anchors.map(a => a.href));
    
    console.log('Page Title:', title);
    console.log('Found Links:', links);

  } catch (error) {
    console.error('Error:', error);
  } finally {
  }
}

runAutomation();