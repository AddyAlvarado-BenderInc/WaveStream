import { chromium } from "playwright";
import dotenv from 'dotenv';
import path from "path";

dotenv.config({
  path: path.resolve(process.cwd(), '../../../../product-management-app', '.env')
});

async function runAutomation() { // product name will be a parameter later
  let browser;
  let page;

  try {
    browser = await chromium.launch({
      headless: false,
      slowMo: 100,
      args: [
        '--window-size=2560,1440',
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
      ],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      viewport: { width: 2560, height: 1440 },
      locale: 'en-US',
    });

    page = await context.newPage();

    const productName = 'Bender Retail R-BC240-2x3.5-100#GC-T' // TODO: delete after productName parameter is updated

    const url = process.env.SITE_URL;
    const username = process.env.SITE_USERNAME
    const password = process.env.SITE_PASSWORD;
    console.log('Navigating to:', url);
    console.log(`Logging in using ${username} and ${password}`);

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForSelector('input[ng-model="data.UserName"]', { state: 'visible' });
    await page.fill('input[ng-model="data.UserName"]', username);
    await page.click('#loginPwd');
    await page.fill('#loginPwd', password);
    await page.click('.login-button');

    page.waitForSelector('#ctl00_ctl00_C_M_LinkColumn3_RepeaterCategories_ctl00_RepeaterItems_ctl06_HyperLinkItem', { state: 'visible' });
    await page.click('#ctl00_ctl00_C_M_LinkColumn3_RepeaterCategories_ctl00_RepeaterItems_ctl06_HyperLinkItem');

    await page.waitForSelector('input[name="globaleSearch"]');
    await page.fill('input[name="globaleSearch"]', productName);
    await page.keyboard.press('Enter');

    await page.waitForSelector('a.pointerCursor.ng-star-inserted');
    await page.click('a.pointerCursor.ng-star-inserted');

    // After the starter code, we can begin variable automation below

  } catch (error) {
    console.error('Error:', error);
  } finally {
  }
}

runAutomation();