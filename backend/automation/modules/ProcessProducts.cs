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
            ProcessProducts processProducts
        )
        {
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
                await ProcessProductsAsync(product, page);
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
            int maxRetries = 3,
            int newPageTimeoutMs = 20000
        )
        {
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

        public async Task ProcessProductsAsync(dynamic product, IPage page)
        {
            ProductInfoFill productInfoFill = new ProductInfoFill();
            UploadProductIcon uploadProductIcon = new UploadProductIcon();

            const string anyQuantitiesButton =
                "#ctl00_ctl00_C_M_ctl00_W_ctl01_OrderQuantitiesCtrl__AnyQuantities";
            const string advancedQuantitiesButton =
                "#ctl00_ctl00_C_M_ctl00_W_ctl01_OrderQuantitiesCtrl__Advanced";

            string productName = product.ItemName;
            string displayName = product.DisplayName;
            string itemTemplate = product.ItemTemplate;
            string advancedRanges = product.AdvancedRange;
            string orderQuantities = product.OrderQuantity;
            dynamic icon = product.Icon;
            dynamic pdf = product.PDFUploadName;
            string ticketTemplates = product.TicketTemplate;
            string shippingWidths = product.ShippingWidth;
            string shippingLengths = product.ShippingLength;
            string shippingHeights = product.ShippingHeight;
            string shippingMaxs = product.ShippingMaxQtyPerSub;
            string buyerConfigs = product.BuyerConfiguration;
            string productType = product.Type;
            string weightInput = product.WeightInput;
            string maxQuantity = product.MaxQuantity;
            string showQtyPrice = product.ShowQtyPrice;
            string briefDescription = product.BriefDescription;

            string startingRange = product.RangeStart;
            string endingRange = product.RangeEnd;
            string regularPrices = product.RegularPrice;
            string setupPrices = product.SetupPrice;
            string skipProduct = product.SkipProduct;

            await WaitForProductItemNameAsync(page, product, this);
            var newPage = await TryOpenNewPageAsync(page);

            if (skipProduct != null)
            {
                Console.WriteLine($"Skipping product: {productName}");
                return;
            }
            try
            {
                if (!ValidProductTypesAsync(productType))
                {
                    throw new Exception($"Invalid product type: {productType}");
                }
                else if (productType == null || productType == "")
                {
                    throw new Exception($"Product type is null or empty: {productType}");
                }

                Console.WriteLine($"Processing product: {productName}");
                if (productName == "")
                {
                    throw new Exception($"Product name is null or empty: {productName}");
                }
                else if (productName != null && productName != "")
                {
                    if (productName.Length > 0 && productName.Length < 100)
                    {
                        Console.WriteLine($"Valid product name: {productName}");
                        await SearchProductName(productName, page);

                        await newPage.Locator("body").WaitForAsync();
                        Console.WriteLine("Found The Page!");

                        await ValidTypeAndNameCheck(productType, productName, newPage);

                        await productInfoFill.FillProductInfo(
                            newPage,
                            displayName,
                            itemTemplate,
                            briefDescription
                        );
                        await uploadProductIcon.UploadIconsAsync(icon, newPage);
                    }
                    else
                    {
                        Console.WriteLine($"Invalid product name: {productName}");
                        return;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex}");
            }
            finally
            {
                Console.WriteLine("Saving product...");
                await newPage.Locator("input[value=\"Save & Exit\"]").ClickAsync();
                await page.BringToFrontAsync();
                Console.WriteLine("Product saved successfully and page brought to front.");
            }
        }
    }
}
