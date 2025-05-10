using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Playwright;

namespace backend.automation.modules
{
    public class ProcessProducts
    {
        public async Task WaitForProductItemNameAsync(
            IPage page,
            dynamic product,
            ProcessProducts processProducts,
            int taskId
        )
        {
            await page.Locator(
                    "#ctl00_ctl00_C_Menu_RepeaterCategories_ctl07_RepeaterItems_ctl06_HyperLinkItem"
                )
                .ClickAsync();
            Console.WriteLine(
                $"[Task {taskId} - {DateTime.Now:HH:mm:ss.fff}] WaitForProductItemNameAsync for: {product.ItemName}"
            );
            ILocator itemNameLocator = page.Locator("td .celldata a.pointerCursor span").Nth(1);
            string itemName = await itemNameLocator.EvaluateAsync<string>("el => el.innerText");
            string expectedItemName = product.ItemName.ToString();
            int retries = 0;
            int maxRetries = 3;
            int totalRetries = 0;
            int maxTotalRetries = 15;

            while (itemName != expectedItemName && retries < maxRetries)
            {
                Console.WriteLine($"Waiting for product name: {expectedItemName}");
                await processProducts.SearchProductName(expectedItemName, page);
                await Task.Delay(2000);
                itemName = await itemNameLocator.EvaluateAsync<string>("el => el.innerText");
                retries++;
            }

            if (retries == maxRetries)
            {
                await page.ReloadAsync();
                await ProcessProductsAsync(product, page, taskId);
            }
            else if (totalRetries == maxTotalRetries)
            {
                throw new Exception(
                    $"Failed to find product name '{expectedItemName}' after {maxTotalRetries} total retries."
                );
            }
        }

        public bool ValidProductTypesAsync(string productType)
        {
            switch (productType)
            {
                case "Static Document":
                case "Ad Hoc":
                case "Product Matrix":
                case "Non Printed Products":
                    return true;
                default:
                    return false;
            }
        }

        public async Task<bool> ValidTypeAndNameCheck(
            string productType,
            string productName,
            IPage page
        )
        {
            string productNameSelector = "#ctl00_ctl00_C_M_ctl00_W_ctl01__Name";
            string productNameEvaluation = await page.EvalOnSelectorAsync<string>(
                productNameSelector,
                "el => el.value"
            );

            if (string.IsNullOrEmpty(productType) || string.IsNullOrEmpty(productName))
            {
                Console.WriteLine("Product type or name is null or empty.");
                return false;
            }
            else if (productNameEvaluation == productName)
            {
                Console.WriteLine($"Valid product name: {productName}");
            }

            if (productType.Length > 0 && productType.Length < 100)
            {
                Console.WriteLine($"Valid product type: {productType}");
                return true;
            }
            else
            {
                Console.WriteLine($"Invalid product type: {productType}");
                return false;
            }
        }

        public async Task<string> SearchProductName(string productName, IPage page)
        {
            string searchBar = "input[name=\"globaleSearch\"]";
            await page.Locator(searchBar).FillAsync(productName);
            await page.Locator(searchBar).PressAsync("Enter");
            return $"Product {productName} searched successfully.";
        }

        public async Task<IPage> TryOpenNewPageAsync(
            IPage originalPage,
            int taskId,
            int maxRetries = 3,
            int newPageTimeoutMs = 20000
        )
        {
            Console.WriteLine(
                $"[Task {taskId} - {DateTime.Now:HH:mm:ss.fff}] TryOpenNewPageAsync from page: {originalPage.Url}"
            );
            int retries = 0;
            string clickSelector = "a.pointerCursor.ng-star-inserted";

            while (retries < maxRetries)
            {
                try
                {
                    var clickAction = originalPage.ClickAsync(clickSelector);

                    var newPage = await originalPage.Context.RunAndWaitForPageAsync(
                        async () =>
                        {
                            await clickAction;
                        },
                        new BrowserContextRunAndWaitForPageOptions { Timeout = newPageTimeoutMs }
                    );

                    if (newPage != null)
                    {
                        float pageInitializationTimeout = newPageTimeoutMs * 0.8f;
                        await newPage.WaitForLoadStateAsync(
                            LoadState.DOMContentLoaded,
                            new PageWaitForLoadStateOptions { Timeout = pageInitializationTimeout }
                        );
                        await newPage.SetViewportSizeAsync(1920, 1080);
                        return newPage;
                    }
                    else
                    {
                        throw new Exception(
                            "RunAndWaitForPageAsync returned null without throwing a timeout exception."
                        );
                    }
                }
                catch (TimeoutException tex)
                {
                    retries++;
                    Console.WriteLine(
                        $"Attempt {retries}/{maxRetries} to open new page via click timed out: {tex.Message}"
                    );
                    if (retries >= maxRetries)
                    {
                        Console.Error.WriteLine(
                            $"Failed to open a new page via click after {maxRetries} attempts due to timeout."
                        );
                        throw new Exception(
                            $"Failed to open and initialize a new page via click on '{clickSelector}' after {maxRetries} attempts. Last error: Timeout",
                            tex
                        );
                    }
                    await Task.Delay(1000);
                }
                catch (Exception ex)
                {
                    retries++;
                    Console.WriteLine(
                        $"Attempt {retries}/{maxRetries} to open new page via click failed: {ex.GetType().Name} - {ex.Message}"
                    );

                    if (retries >= maxRetries)
                    {
                        Console.Error.WriteLine(
                            $"Failed to open a new page via click after {maxRetries} attempts."
                        );
                        throw new Exception(
                            $"Failed to open and initialize a new page via click on '{clickSelector}' after {maxRetries} attempts. Last error: {ex.Message}",
                            ex
                        );
                    }
                    await Task.Delay(1000);
                }
            }

            throw new Exception(
                $"Max retries ({maxRetries}) exceeded for TryOpenNewPageAsync, but no page was returned or specific exception thrown from the loop."
            );
        }

        public async Task<IPage?> ProcessProductsAsync(dynamic product, IPage page, int taskId)
        {
            ProductInfoFill productInfoFill = new ProductInfoFill();
            UploadProductIcon uploadProductIcon = new UploadProductIcon();
            ProductDetailFill productDetailFill = new ProductDetailFill();
            IPage? newPage = null;

            string productName = product.ItemName;
            string displayName = product.DisplayName;
            string itemTemplate = product.ItemTemplate;
            dynamic icon = product.Icon;
            string productType = product.Type;
            string briefDescription = product.BriefDescription;
            string longDescription = product.LongDescription;
            string skipProduct = product.SkipProduct;

            Console.WriteLine(
                $"[Task {taskId} - {DateTime.Now:HH:mm:ss.fff}] ProcessProductsAsync START for: {productName}"
            );

            if (skipProduct != null && skipProduct.ToLower() == "true")
            {
                Console.WriteLine($"[Task {taskId}] Skipping product as per data: {productName}");
                return null;
            }

            try
            {
                Console.WriteLine(
                    $"[Task {taskId} - {DateTime.Now:HH:mm:ss.fff}] Before WaitForProductItemNameAsync for: {productName}"
                );
                await WaitForProductItemNameAsync(page, product, this, taskId);
                Console.WriteLine(
                    $"[Task {taskId} - {DateTime.Now:HH:mm:ss.fff}] After WaitForProductItemNameAsync, Before TryOpenNewPageAsync for: {productName}"
                );

                newPage = await TryOpenNewPageAsync(page, taskId);
                Console.WriteLine(
                    $"[Task {taskId}] Detail page ('newPage') opened for product '{productName}'. Current URL: {newPage.Url}"
                );

                if (!ValidProductTypesAsync(productType))
                {
                    throw new Exception(
                        $"Invalid product type: {productType} for product {productName}"
                    );
                }
                else if (string.IsNullOrEmpty(productType))
                {
                    throw new Exception($"Product type is null or empty for {productName}");
                }

                Console.WriteLine(
                    $"[Task {taskId}] Processing details for product: {productName} on its detail page."
                );
                if (string.IsNullOrEmpty(productName))
                {
                    throw new Exception($"Product name is null or empty.");
                }

                await newPage
                    .Locator("body")
                    .WaitForAsync(new LocatorWaitForOptions { Timeout = 15000 });
                Console.WriteLine(
                    $"[Task {taskId}] Detail page for '{productName}' appears ready."
                );

                await ValidTypeAndNameCheck(productType, productName, newPage);

                Console.WriteLine(
                    $"[Task {taskId} - {DateTime.Now:HH:mm:ss.fff}] Before FillProductInfo for: {productName}"
                );
                await productInfoFill.FillProductInfo(
                    newPage,
                    productName,
                    displayName,
                    itemTemplate,
                    briefDescription
                );
                Console.WriteLine(
                    $"[Task {taskId} - {DateTime.Now:HH:mm:ss.fff}] After FillProductInfo for: {productName}"
                );

                await uploadProductIcon.UploadIconsAsync(productName, icon, newPage);
                await productDetailFill.FillLongDescription(newPage, longDescription, productName);

                Console.WriteLine(
                    $"[Task {taskId}] Successfully processed data for product: {productName}. Ready for save."
                );
                return newPage;
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"[Task {taskId}] Error processing product {productName} before save: {ex.ToString()}"
                );
                if (newPage != null && !newPage.IsClosed)
                {
                    try
                    {
                        Console.WriteLine(
                            $"[Task {taskId}] Closing detail page for {productName} due to processing error."
                        );
                        await newPage.CloseAsync();
                    }
                    catch (Exception closeEx)
                    {
                        Console.WriteLine(
                            $"[Task {taskId}] Error closing detail page for {productName} after processing error: {closeEx.Message}"
                        );
                    }
                }
                return null;
            }
        }
    }
}
