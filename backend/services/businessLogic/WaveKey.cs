using Microsoft.Playwright;
using dotenv.net;
using System;

class Wavekey {
    public Wavekey() {
        DotEnv.Load(options: new DotEnvOptions(envFilePaths: new[] { ".env" }));
    }
    public async Task runPlaywright() {
        string benderUsername = DotEnv.Read()["BENDER_USERNAME"];
        string benderPassword = DotEnv.Read()["BENDER_PASSWORD"];
        string benderSite = DotEnv.Read()["BENDER_ADMIN_WEBSITE"];

        try {
            // TODO: Replace with actual automation code from our javascript file and refactor logic for C#
            var playwright = await Playwright.CreateAsync();
            var browser = await playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
            {
                Headless = false,
                ExecutablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
            });
            var page = await browser.NewPageAsync();
            await page.GotoAsync(benderSite);
            await page.WaitForSelectorAsync("input[ng-model=\"data.UserName\"]");
            await page.WaitForSelectorAsync("#loginPwd");
            await page.FillAsync("input[ng-model=\"data.UserName\"]", benderUsername);
            await page.FillAsync("#loginPwd", benderPassword);
            await page.ClickAsync(".login-button");

            Console.WriteLine("Logged in successfully!");
        }
        catch (Exception ex) {
            Console.WriteLine($"Error: {ex.Message}");
            throw;
        }
        finally {
            // TODO: Add cleanup logic here
        }
    }
}