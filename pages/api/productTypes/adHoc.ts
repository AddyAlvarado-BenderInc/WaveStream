import { chromium } from "playwright";
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
      await page.goto(url);

      // Example: Get the page title
      const title = await page.title();

      // Example: Take a screenshot
      await page.screenshot({ path: 'screenshot.png' });

      // Example: Get all links on the page
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map(a => a.href);
      });

      await browser.close();

      res.status(200).json({
        title,
        screenshotPath: 'screenshot.png',
        links
      });
    } catch (error) {
      await browser.close();
      res.status(500).json({ error: 'An error occurred during web scraping' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
