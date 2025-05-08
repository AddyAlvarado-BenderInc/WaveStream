using backend.automation.modules;
using Microsoft.Playwright;

class runAuto
{
    public async Task RunAutomation(dynamic products, IPage page, IBrowser browser)
    {
        ProcessProducts processProducts = new ProcessProducts();
        int processedProducts = 0;
        try
        {
            await page.Locator(
                    "#ctl00_ctl00_C_Menu_RepeaterCategories_ctl07_RepeaterItems_ctl06_HyperLinkItem"
                )
                .ClickAsync();
            Console.WriteLine($"Total products to process: {products.Count}");
            foreach (var product in products)
            {
                Console.WriteLine($"Processing product: {product.ItemName}");
                await processProducts.ProcessProductsAsync(product, page);
                processedProducts++;
                if (processedProducts == products.Count)
                {
                    Console.WriteLine("All products processed successfully.");
                    // send success email
                    // await SendEmailAsync("Success", "All products processed successfully.");

                    // play success sound
                    // await PlaySoundAsync("success.mp3");
                }
                else
                {
                    Console.WriteLine(
                        $"Processed {processedProducts} out of {products.Count} products."
                    );
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            throw;
        }
        finally
        {
            Console.WriteLine("Closing browser");
        }
    }

    public void CloseBrowser() { }
}
