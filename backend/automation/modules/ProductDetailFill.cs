using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Playwright;

namespace backend.automation.modules
{
    public class ProductDetailFill
    {
        public async Task MoveToDetailsTab(IPage page)
        {
            var detailsTab = await page.QuerySelectorAsync("#TabDetails");
            if (detailsTab != null)
            {
                await detailsTab.ClickAsync();
                Console.WriteLine("-- Moved to Details tab --");
            }
            else
            {
                Console.WriteLine("-- Details tab not found --");
            }
        }

        public async Task<bool> DetectFilledDetails(IPage page, string description)
        {
            var evaluation = await page.EvaluateAsync(
                @"(description) => {
                const details = document.querySelectorAll('textarea.reTextArea');
                return Array.from(details).map(detail => detail.innerText).includes(description);
            }",
                description
            );

            return evaluation?.GetBoolean() ?? false;
        }

        public async Task FillLongDescription(IPage page, string description, string productName)
        {
            string htmlButton =
                "#ctl00_ctl00_C_M_ctl00_W_ctl01__LongDescription_ModesWrapper .reMode_html";
            string textareaSelector =
                "#ctl00_ctl00_C_M_ctl00_W_ctl01__LongDescriptionWrapper textarea.reTextArea";

            try
            {
                if (description == null)
                {
                    Console.WriteLine(
                        $"-- No long description provided for {productName}. Skipping long description fill --"
                    );
                    return;
                }
                Console.WriteLine($"-- Filling long description for {productName} --");
                await MoveToDetailsTab(page);
                await page.Locator(htmlButton).ClickAsync();
                Console.WriteLine("Switched to HTML mode.");

                var textareaLocator = page.Locator(textareaSelector);

                if (await textareaLocator.IsVisibleAsync())
                {
                    await textareaLocator.FillAsync(description);
                    Console.WriteLine("Long description filled successfully.");
                }
                else
                {
                    throw new Exception(
                        $"Textarea for long description (selector: {textareaSelector}) not found or not visible after switching to HTML mode!"
                    );
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"-- Error filling long description for {productName}: {ex.Message} --"
                );
                throw;
            }
        }
    }
}
