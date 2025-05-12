using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Playwright;

namespace backend.automation.modules
{
    public class ProcessProducts
    {
        public async Task WaitForProductItemNameAsync(
            IPage page,
            dynamic product,
            ProcessProducts processProductsInstance,
            int taskId,
            CancellationToken cancellationToken
        )
        {
            cancellationToken.ThrowIfCancellationRequested();

            await page.Locator(
                    "#ctl00_ctl00_C_Menu_RepeaterCategories_ctl07_RepeaterItems_ctl06_HyperLinkItem"
                )
                .ClickAsync(new LocatorClickOptions { Timeout = 10000 });

            Console.WriteLine(
                $"[Task {taskId} - {DateTime.Now:HH:mm:ss.fff}] WaitForProductItemNameAsync for: {product.ItemName}"
            );

            ILocator itemNameLocator = page.Locator("td .celldata a.pointerCursor span").Nth(1);
            string itemName = "";
            string expectedItemName = product.ItemName.ToString();
            int retries = 0;
            const int maxRetries = 3;

            Console.WriteLine(
                $"[Task {taskId}] Initial search for product name: {expectedItemName}"
            );
            await processProductsInstance.SearchProductName(
                expectedItemName,
                page,
                cancellationToken
            );

            await Task.Delay(2500, cancellationToken);

            try
            {
                itemName = await itemNameLocator.EvaluateAsync<string>(
                    "el => el.innerText",
                    new LocatorEvaluateOptions { Timeout = 5000 }
                );
            }
            catch (TimeoutException)
            {
                Console.WriteLine(
                    $"[Task {taskId}] Timeout evaluating item name after initial search for {expectedItemName}. Will proceed to retries."
                );
            }

            while (itemName != expectedItemName && retries < maxRetries)
            {
                cancellationToken.ThrowIfCancellationRequested();
                retries++;
                Console.WriteLine(
                    $"[Task {taskId}] Attempt {retries}/{maxRetries} - Waiting for product name: {expectedItemName}. Current found: '{itemName}'"
                );

                await processProductsInstance.SearchProductName(
                    expectedItemName,
                    page,
                    cancellationToken
                );
                await Task.Delay(2000 + (retries * 500), cancellationToken);

                try
                {
                    itemName = await itemNameLocator.EvaluateAsync<string>(
                        "el => el.innerText",
                        new LocatorEvaluateOptions { Timeout = 5000 }
                    );
                }
                catch (TimeoutException)
                {
                    Console.WriteLine(
                        $"[Task {taskId}] Timeout evaluating item name on attempt {retries} for {expectedItemName}."
                    );
                }
            }

            if (itemName != expectedItemName)
            {
                throw new Exception(
                    $"[Task {taskId}] Failed to find product name '{expectedItemName}' after {maxRetries} search attempts. Last found: '{itemName}'."
                );
            }

            Console.WriteLine($"[Task {taskId}] Product name '{expectedItemName}' confirmed.");
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
            IPage page,
            CancellationToken cancellationToken
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
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

            if (productNameEvaluation == productName)
            {
                Console.WriteLine($"Valid product name: {productName}");
            }
            else
            {
                Console.WriteLine(
                    $"Product name mismatch on page. Expected: '{productName}', Found: '{productNameEvaluation}'."
                );
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

        public async Task<string> SearchProductName(
            string productName,
            IPage page,
            CancellationToken cancellationToken
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            string searchBar = "input[name=\"globaleSearch\"]";
            await page.Locator(searchBar).FillAsync(productName);
            await page.Locator(searchBar).PressAsync("Enter");
            return $"Product {productName} searched successfully.";
        }

        public async Task<IPage> TryOpenNewPageAsync(
            IPage originalPage,
            string productName,
            int taskId,
            CancellationToken cancellationToken,
            int maxRetries = 3,
            int newPageTimeoutMs = 20000
        )
        {
            Console.WriteLine(
                $"[Task {taskId} - {DateTime.Now:HH:mm:ss.fff}] TryOpenNewPageAsync for product '{productName}' from page: {originalPage.Url}"
            );
            int retries = 0;

            ILocator productLinkLocator = originalPage
                .GetByRole(AriaRole.Cell, new() { Name = productName, Exact = true })
                .Locator("a.pointerCursor.ng-star-inserted");

            while (retries < maxRetries)
            {
                cancellationToken.ThrowIfCancellationRequested();
                try
                {
                    await productLinkLocator.WaitForAsync(
                        new LocatorWaitForOptions
                        {
                            State = WaitForSelectorState.Visible,
                            Timeout = (uint)(newPageTimeoutMs * 0.25),
                        }
                    );

                    var clickAction = productLinkLocator.ClickAsync(
                        new LocatorClickOptions { Timeout = (uint)(newPageTimeoutMs * 0.5) }
                    );
                    var newPage = await originalPage.Context.RunAndWaitForPageAsync(
                        async () =>
                        {
                            await clickAction;
                        },
                        new BrowserContextRunAndWaitForPageOptions { Timeout = newPageTimeoutMs }
                    );

                    if (newPage != null)
                    {
                        cancellationToken.ThrowIfCancellationRequested();
                        await newPage.WaitForLoadStateAsync(
                            LoadState.DOMContentLoaded,
                            new PageWaitForLoadStateOptions
                            {
                                Timeout = (uint)(newPageTimeoutMs * 0.8),
                            }
                        );
                        await newPage.SetViewportSizeAsync(1920, 1080);
                        return newPage;
                    }
                    throw new Exception("RunAndWaitForPageAsync returned null.");
                }
                catch (TimeoutException tex)
                {
                    retries++;
                    Console.WriteLine(
                        $"Attempt {retries}/{maxRetries} to open new page timed out: {tex.Message}"
                    );
                    if (retries >= maxRetries)
                        throw new Exception(
                            $"Failed to open new page via click on product '{productName}' after {maxRetries} attempts due to timeout.",
                            tex
                        );
                    await Task.Delay(1000, cancellationToken);
                }
                catch (Exception ex) when (!(ex is OperationCanceledException))
                {
                    retries++;
                    Console.WriteLine(
                        $"Attempt {retries}/{maxRetries} to open new page failed: {ex.Message}"
                    );
                    if (retries >= maxRetries)
                        throw new Exception(
                            $"Failed to open new page via click on product '{productName}' after {maxRetries} attempts. Last error: {ex.Message}",
                            ex
                        );
                    await Task.Delay(1000, cancellationToken);
                }
            }
            throw new Exception("Max retries exceeded for TryOpenNewPageAsync.");
        }

        public async Task<IPage?> ProcessProductsAsync(
            dynamic product,
            IPage page,
            int taskId,
            CancellationToken cancellationToken
        )
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
            cancellationToken.ThrowIfCancellationRequested();

            if (skipProduct?.ToLower() == "true")
            {
                Console.WriteLine($"[Task {taskId}] Skipping product as per data: {productName}");
                return null;
            }

            try
            {
                Console.WriteLine(
                    $"[Task {taskId} - {DateTime.Now:HH:mm:ss.fff}] Before WaitForProductItemNameAsync for: {productName}"
                );
                await WaitForProductItemNameAsync(page, product, this, taskId, cancellationToken);

                cancellationToken.ThrowIfCancellationRequested();
                Console.WriteLine(
                    $"[Task {taskId} - {DateTime.Now:HH:mm:ss.fff}] After WaitForProductItemNameAsync, Before TryOpenNewPageAsync for: {productName}"
                );
                newPage = await TryOpenNewPageAsync(page, productName, taskId, cancellationToken);

                cancellationToken.ThrowIfCancellationRequested();
                Console.WriteLine(
                    $"[Task {taskId}] Detail page ('newPage') opened for product '{productName}'. Current URL: {newPage.Url}"
                );

                if (!ValidProductTypesAsync(productType))
                    throw new Exception(
                        $"Invalid product type: {productType} for product {productName}"
                    );
                if (string.IsNullOrEmpty(productType))
                    throw new Exception($"Product type is null or empty for {productName}");
                if (string.IsNullOrEmpty(productName))
                    throw new Exception($"Product name is null or empty.");

                await newPage
                    .Locator("body")
                    .WaitForAsync(new LocatorWaitForOptions { Timeout = 15000 });
                Console.WriteLine(
                    $"[Task {taskId}] Detail page for '{productName}' appears ready."
                );

                cancellationToken.ThrowIfCancellationRequested();
                await ValidTypeAndNameCheck(productType, productName, newPage, cancellationToken);

                cancellationToken.ThrowIfCancellationRequested();
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

                cancellationToken.ThrowIfCancellationRequested();
                Console.WriteLine(
                    $"[Task {taskId} - {DateTime.Now:HH:mm:ss.fff}] After FillProductInfo for: {productName}"
                );
                await uploadProductIcon.UploadIconsAsync(productName, icon, newPage);

                cancellationToken.ThrowIfCancellationRequested();
                await productDetailFill.FillLongDescription(newPage, longDescription, productName);

                cancellationToken.ThrowIfCancellationRequested();
                Console.WriteLine(
                    $"[Task {taskId}] Successfully processed data for product: {productName}. Ready for save."
                );
                return newPage;
            }
            catch (OperationCanceledException)
            {
                Console.WriteLine(
                    $"[Task {taskId}] Processing for product {productName} was cancelled."
                );
                if (newPage != null && !newPage.IsClosed)
                    await newPage.CloseAsync();
                throw;
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
