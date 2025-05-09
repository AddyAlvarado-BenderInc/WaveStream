using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Playwright;

namespace backend.automation.modules
{
    public class ProductInfoFill
    {
        public static bool ProductQueriedDisplayName(IPage page, string displayName)
        {
            string queriedProduct = page.EvalOnSelectorAsync<string>(
                "input[name=\"ctl00$ctl00$C$M$ctl00$W$ctl01$_StorefrontName\"]",
                "el => el.value"
            ).Result;
            if (string.IsNullOrEmpty(queriedProduct))
            {
                Console.WriteLine("Queried product is null or empty.");
                return false;
            }
            else if (queriedProduct == displayName)
            {
                Console.WriteLine(
                    $"Queried product of {queriedProduct} matches display name of {displayName}"
                );
                return true;
            }
            else
            {
                Console.WriteLine($"Queried product: {queriedProduct}");
                return false;
            }
        }

        public static bool ProductQueriedItemTemplate(IPage page, string itemTemplate)
        {
            string queriedItemTemplate = page.EvalOnSelectorAsync<string>(
                "input[name=\"ctl00$ctl00$C$M$ctl00$W$ctl01$txtMISEstimateId\"]",
                "el => el.value"
            ).Result;
            if (string.IsNullOrEmpty(queriedItemTemplate))
            {
                Console.WriteLine("Queried item template is null or empty.");
                return false;
            }
            else if (queriedItemTemplate == itemTemplate)
            {
                Console.WriteLine(
                    $"Queried item template of {queriedItemTemplate} matches item template of {itemTemplate}"
                );
                return true;
            }
            else
            {
                Console.WriteLine($"Queried item template: {queriedItemTemplate}");
                return false;
            }
        }

        public async Task FillProductInfo(
            IPage page,
            string productName,
            string displayName,
            string itemTemplate,
            string briefDescription
        )
        {
            ILocator htmlElement = page.Locator(".reEditorModes ul li");
            ILocator secondHtmlItem = htmlElement.Nth(1);
            string textAreaSelector = "textarea.reTextArea";
            bool isDisplay = !string.IsNullOrEmpty(displayName);
            bool isItemTemplate = !string.IsNullOrEmpty(itemTemplate);

            Console.WriteLine($"-- Entering FillProductInfo method for {productName}--");
            await page.EvaluateAsync("window.scrollTo(0, 0);");

            if (isDisplay)
            {
                Console.WriteLine($"Display name found: {displayName}");
                if (!ProductQueriedDisplayName(page, displayName) && displayName != "")
                {
                    string displayNameSelector = "input[name=\"ctl00$ctl00$C$M$ctl00$W$ctl01$_StorefrontName\"]";
                    await page.Locator(displayNameSelector).FillAsync(displayName);
                    Console.WriteLine($"Display name filled: {displayName}");
                }
            }
            else if (!isDisplay)
            {
                Console.WriteLine("Display name is null or empty. Skipping fill.");
            }

            if (isItemTemplate)
            {
                Console.WriteLine($"Item template found: {itemTemplate}");
                if (!ProductQueriedItemTemplate(page, itemTemplate) && itemTemplate != "")
                {
                    string itemTemplateSelector = "input[name=\"ctl00$ctl00$C$M$ctl00$W$ctl01$txtMISEstimateId\"]";
                    await page.Locator(itemTemplateSelector).FillAsync(itemTemplate);
                    Console.WriteLine($"Item template filled: {itemTemplate}");
                }
            }
            else if (!isItemTemplate)
            {
                Console.WriteLine("Item template is null or empty. Skipping fill.");
            }

            if (!string.IsNullOrEmpty(briefDescription))
            {
                Console.WriteLine($"Brief description found: {briefDescription}");
                await secondHtmlItem.ClickAsync();
                await page.Locator(textAreaSelector).FillAsync(briefDescription);
                Console.WriteLine($"Brief description filled: {briefDescription}");
            }
            else
            {
                Console.WriteLine("Brief description is null or empty. Skipping fill.");
            }
            Console.WriteLine($"-- Exiting FillProductInfo method for {productName}--");
        }
    }
}
