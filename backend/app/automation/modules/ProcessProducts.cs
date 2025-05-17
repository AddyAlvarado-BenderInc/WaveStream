using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Playwright;
using Newtonsoft.Json.Linq;

namespace backend.automation.modules
{
    public class ProcessProducts
    {
        public async Task WaitForProductItemNameAsync(
            IPage page,
            dynamic product,
            ProcessProducts processProductsInstance,
            int taskId,
            CancellationToken cancellationToken,
            Func<string, Task> signalRLogger
        )
        {
            cancellationToken.ThrowIfCancellationRequested();

            await page.Locator(
                    "#ctl00_ctl00_C_Menu_RepeaterCategories_ctl07_RepeaterItems_ctl06_HyperLinkItem"
                )
                .ClickAsync(new LocatorClickOptions { Timeout = 10000 });

            string logProductName = ConvertDynamicToString(
                product.ItemName,
                "ItemName",
                "Unknown Product"
            );

            Console.WriteLine(
                $"[Task {taskId} - {DateTime.Now:HH:mm:ss.fff}] WaitForProductItemNameAsync for: {logProductName}"
            );
            await signalRLogger(
                $"[ProcessProducts Task {taskId}] Waiting for product item name: {logProductName}"
            );

            ILocator itemNameLocator = page.Locator("td .celldata a.pointerCursor span").Nth(1);
            string itemName = "";
            string expectedItemName = logProductName;
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
                    $"[Task {taskId}] [Error] Timeout evaluating item name after initial search for {expectedItemName}. Will proceed to retries if name was previously found."
                );
            }

            if (string.IsNullOrEmpty(itemName))
            {
                throw new Exception(
                    $"[Task {taskId}] [Error] Product name '{expectedItemName}' not found or locator returned empty/null after initial search and evaluation. The product may not exist or is not visible."
                );
            }

            while (itemName != expectedItemName && retries < maxRetries)
            {
                cancellationToken.ThrowIfCancellationRequested();
                retries++;
                Console.WriteLine(
                    $"[Task {taskId}] Attempt {retries}/{maxRetries} - Waiting for product name: {expectedItemName}. Current found: '{itemName}'"
                );
                await signalRLogger(
                    $"[ProcessProducts Task {taskId}] Retry {retries}/{maxRetries} for product name: {expectedItemName}. Found: '{itemName}'"
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
                        $"[Task {taskId}] [Error] Timeout evaluating item name on attempt {retries} for {expectedItemName}."
                    );
                }
            }

            if (itemName != expectedItemName)
            {
                throw new Exception(
                    $"[Task {taskId}] [Error] Failed to find product name '{expectedItemName}' after {maxRetries} search attempts. Last found: '{itemName}'."
                );
            }

            Console.WriteLine($"[Task {taskId}] Product name '{expectedItemName}' confirmed.");
            await signalRLogger(
                $"[ProcessProducts Task {taskId}] Product name '{expectedItemName}' confirmed."
            );
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
            Func<string, Task> signalRLogger,
            int maxRetries = 3,
            int newPageTimeoutMs = 20000
        )
        {
            var logMessage =
                $"[Task {taskId} - {DateTime.Now:HH:mm:ss.fff}] TryOpenNewPageAsync for product '{productName}' from page: {originalPage.Url}";
            Console.WriteLine(logMessage);
            await signalRLogger($"[ProcessProducts] {logMessage}");

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

                    throw new Exception(
                        $"[Task {taskId}] [Error] RunAndWaitForPageAsync returned null for product '{productName}'."
                    );
                }
                catch (TimeoutException tex)
                {
                    retries++;
                    Console.WriteLine(
                        $"[Task {taskId}] [Error] Attempt {retries}/{maxRetries} to open new page timed out: {tex.Message}"
                    );
                    await signalRLogger(
                        $"[ProcessProducts Task {taskId}] [Error] Timeout on attempt {retries} for product '{productName}': {tex.Message.Split('\n')[0]}"
                    );
                    if (retries >= maxRetries)
                        throw new Exception(
                            $"[Task {taskId}] [Error] Failed to open new page via click on product '{productName}' after {maxRetries} attempts due to timeout.",
                            tex
                        );
                    await Task.Delay(1000, cancellationToken);
                }
                catch (Exception ex) when (!(ex is OperationCanceledException))
                {
                    retries++;
                    Console.WriteLine(
                        $"[Task {taskId}] [Error] Attempt {retries}/{maxRetries} to open new page failed: {ex.Message}"
                    );
                    await signalRLogger(
                        $"[ProcessProducts Task {taskId}] [Error] Error on attempt {retries} for product '{productName}': {ex.Message.Split('\n')[0]}"
                    );
                    if (retries >= maxRetries)
                    {
                        await signalRLogger(
                            $"[USER] SAVE_FAIL: [Task {taskId}] [Fail] Product '{productName}' page failed to open after {maxRetries} attempts. Last error: {ex.Message.Split('\n')[0]}."
                        );
                        throw new Exception(
                            $"[Task {taskId}] [Error] Failed to open new page via click on product '{productName}' after {maxRetries} attempts. Last error: {ex.Message}",
                            ex
                        );
                    }
                    await signalRLogger(
                        $"[USER] SAVE_WARN: [Task {taskId}] [Error] Product '{productName}' page failing to open on attempt {retries}. Error: {ex.Message.Split('\n')[0]}."
                    );
                    await Task.Delay(1000, cancellationToken);
                }
            }
            throw new Exception(
                $"[Task {taskId}] [Error] Max retries exceeded for TryOpenNewPageAsync for product '{productName}'."
            );
        }

        private string ConvertDynamicToString(
            dynamic? value,
            string fieldNameForLog = "",
            string defaultValue = ""
        )
        {
            if (value == null)
                return defaultValue;

            if (value is JValue jv)
            {
                return jv.Value?.ToString() ?? defaultValue;
            }
            if (value is string s)
            {
                return s;
            }

            if (value is JObject || value is JArray)
            {
                Console.WriteLine(
                    $"Warning: ConvertDynamicToString for field '{fieldNameForLog}' received complex type {value.GetType().Name} where a simple string was expected. Value: {value.ToString(Newtonsoft.Json.Formatting.None)}. Returning default."
                );

                return defaultValue;
            }

            return value.ToString() ?? defaultValue;
        }

        private string ConvertDynamicPriceDataToString(
            dynamic? priceData,
            Func<string, Task> signalRLogger,
            int taskId,
            string fieldName
        )
        {
            if (priceData == null)
                return "";

            if (priceData is string s)
            {
                return s;
            }
            if (priceData is JValue jv)
            {
                return jv.Value?.ToString() ?? "";
            }
            if (priceData is JArray ja)
            {
                return string.Join(
                    ",",
                    ja.Select(token =>
                        (token is JValue jtVal ? jtVal.Value?.ToString() : token.ToString())?.Trim()
                        ?? ""
                    )
                );
            }
            if (priceData is JObject jo && jo["Composite"] is JArray compositeArray)
            {
                return string.Join(
                    ",",
                    compositeArray.Select(token =>
                        (token is JValue jtVal ? jtVal.Value?.ToString() : token.ToString())?.Trim()
                        ?? ""
                    )
                );
            }

            if (
                priceData is int
                || priceData is long
                || priceData is double
                || priceData is decimal
                || priceData is float
            )
            {
                return priceData.ToString();
            }

            string unexpectedTypeMessage =
                $"[Task {taskId}] Warning: ConvertDynamicPriceDataToString for field '{fieldName}' encountered an unhandled data type '{priceData.GetType().FullName}'. Value: '{priceData.ToString()}'. Returning empty string.";
            Console.WriteLine(unexpectedTypeMessage);

            return "";
        }

        public async Task<IPage?> ProcessProductsAsync(
            dynamic product,
            IPage page,
            int taskId,
            CancellationToken cancellationToken,
            Func<string, Task> signalRLogger
        )
        {
            string productName = ConvertDynamicToString(
                product.ItemName,
                "ItemName",
                "Unknown Product"
            );
            var startMessage =
                $"[Task {taskId} - {DateTime.Now:HH:mm:ss.fff}] ProcessProductsAsync START for: {productName}";
            Console.WriteLine(startMessage);
            await signalRLogger($"[ProcessProducts] {startMessage}");

            ProductInfoFill productInfoFill = new ProductInfoFill();
            UploadProductIcon uploadProductIcon = new UploadProductIcon();
            ProductDetailFill productDetailFill = new ProductDetailFill();
            SettingsTab settingsTab = new SettingsTab();
            ProductPricingAndBuyerConfiguration productPricingAndBuyerConfiguration =
                new ProductPricingAndBuyerConfiguration();
            UploadProductPDF uploadProductPDF = new UploadProductPDF();
            TicketTemplateContainer ticketTemplateContainer = new TicketTemplateContainer();

            IPage? newPage = null;

            string displayName = ConvertDynamicToString(product.DisplayName, "DisplayName");
            string itemTemplate = ConvertDynamicToString(product.ItemTemplate, "ItemTemplate");
            dynamic icon = product.Icon;
            dynamic pdf = product.PDFUploadName;
            string productType = ConvertDynamicToString(product.Type, "Type");
            string briefDescription = ConvertDynamicToString(
                product.BriefDescription,
                "BriefDescription"
            );
            string longDescription = ConvertDynamicToString(
                product.LongDescription,
                "LongDescription"
            );
            string advancedRanges = ConvertDynamicToString(
                product.AdvancedRanges,
                "AdvancedRanges"
            );
            string orderQuantities = ConvertDynamicToString(product.OrderQuantity, "OrderQuantity");
            string shippingWidths = ConvertDynamicToString(product.ShippingWidth, "ShippingWidth");
            string shippingHeights = ConvertDynamicToString(
                product.ShippingHeight,
                "ShippingHeight"
            );
            string shippingLengths = ConvertDynamicToString(
                product.ShippingLength,
                "ShippingLength"
            );
            string shippingMaxs = ConvertDynamicToString(
                product.ShippingMaxQtyPerSub,
                "ShippingMaxQtyPerSub"
            );
            string weightInput = ConvertDynamicToString(product.WeightInput, "WeightInput");
            string maxQuantity = ConvertDynamicToString(product.MaxQuantity, "MaxQuantity");
            string showQtyPrice = ConvertDynamicToString(product.ShowQtyPrice, "ShowQtyPrice");

            string setupPriceStr = ConvertDynamicPriceDataToString(
                product.SetupPrice,
                signalRLogger,
                taskId,
                "SetupPrice"
            );
            string regularPriceStr = ConvertDynamicPriceDataToString(
                product.RegularPrice,
                signalRLogger,
                taskId,
                "RegularPrice"
            );
            string rangeStartStr = ConvertDynamicPriceDataToString(
                product.RangeStart,
                signalRLogger,
                taskId,
                "RangeStart"
            );
            string rangeEndStr = ConvertDynamicPriceDataToString(
                product.RangeEnd,
                signalRLogger,
                taskId,
                "RangeEnd"
            );
            string ticketTemplate = ConvertDynamicToString(
                product.TicketTemplate,
                "TicketTemplate"
            );

            string buyerConfigsStr = ConvertDynamicToString(product.BuyerConfigs, "BuyerConfigs");
            string skipProductStr =
                ConvertDynamicToString(product.SkipProduct, "SkipProduct")?.ToLower() ?? "false";

            cancellationToken.ThrowIfCancellationRequested();

            if (skipProductStr == "true")
            {
                Console.WriteLine($"[Task {taskId}] Skipping product as per data: {productName}");
                await signalRLogger(
                    $"[ProcessProducts Task {taskId}] Skipping product: {productName}"
                );
                return null;
            }

            try
            {
                await signalRLogger(
                    $"[ProcessProducts Task {taskId}] Before WaitForProductItemNameAsync for: {productName}"
                );
                await WaitForProductItemNameAsync(
                    page,
                    product,
                    this,
                    taskId,
                    cancellationToken,
                    signalRLogger
                );

                cancellationToken.ThrowIfCancellationRequested();
                await signalRLogger(
                    $"[ProcessProducts Task {taskId}] Before TryOpenNewPageAsync for: {productName}"
                );
                newPage = await TryOpenNewPageAsync(
                    page,
                    productName,
                    taskId,
                    cancellationToken,
                    signalRLogger
                );

                cancellationToken.ThrowIfCancellationRequested();
                await signalRLogger(
                    $"[ProcessProducts Task {taskId}] Detail page opened for product '{productName}'. Current URL: {newPage?.Url}"
                );

                if (!ValidProductTypesAsync(productType))
                    throw new Exception(
                        $"[Task {taskId}] [Error] Invalid product type: {productType} for product {productName}"
                    );
                if (string.IsNullOrEmpty(productType))
                    throw new Exception(
                        $"[Task {taskId}] [Error] Product type is null or empty for {productName}"
                    );
                if (string.IsNullOrEmpty(productName))
                    throw new Exception($"[Task {taskId}] [Error] Product name is null or empty.");

                if (newPage == null)
                {
                    throw new InvalidOperationException(
                        $"[Task {taskId}] [Error] Detail page (newPage) is unexpectedly null for product '{productName}'."
                    );
                }

                await newPage
                    .Locator("body")
                    .WaitForAsync(new LocatorWaitForOptions { Timeout = 15000 });
                await signalRLogger(
                    $"[ProcessProducts Task {taskId}] Detail page for '{productName}' appears ready."
                );

                cancellationToken.ThrowIfCancellationRequested();
                await ValidTypeAndNameCheck(productType, productName, newPage, cancellationToken);

                cancellationToken.ThrowIfCancellationRequested();
                await signalRLogger(
                    $"[ProcessProducts Task {taskId}] Before FillProductInfo for: {productName}"
                );
                await productInfoFill.FillProductInfo(
                    taskId,
                    newPage,
                    productName,
                    displayName,
                    itemTemplate,
                    briefDescription,
                    signalRLogger
                );

                cancellationToken.ThrowIfCancellationRequested();
                await signalRLogger(
                    $"[ProcessProducts Task {taskId}] After FillProductInfo for: {productName}"
                );
                await uploadProductIcon.UploadIconsAsync(
                    taskId,
                    productName,
                    icon,
                    newPage,
                    signalRLogger
                );

                cancellationToken.ThrowIfCancellationRequested();
                await productDetailFill.FillLongDescription(
                    taskId,
                    newPage,
                    longDescription,
                    productName,
                    signalRLogger
                );

                cancellationToken.ThrowIfCancellationRequested();

                await productPricingAndBuyerConfiguration.ConfigurePricingAndBuyerSettingsAsync(
                    taskId,
                    newPage,
                    signalRLogger,
                    productType,
                    setupPriceStr,
                    regularPriceStr,
                    rangeStartStr,
                    rangeEndStr,
                    buyerConfigsStr
                );

                cancellationToken.ThrowIfCancellationRequested();
                await settingsTab.SettingsTabAsync(
                    taskId,
                    newPage,
                    signalRLogger,
                    productType,
                    advancedRanges,
                    orderQuantities,
                    shippingWidths,
                    shippingHeights,
                    shippingLengths,
                    shippingMaxs,
                    weightInput,
                    maxQuantity,
                    showQtyPrice
                );

                cancellationToken.ThrowIfCancellationRequested();
                await uploadProductPDF.UploadPDFAsync(
                    taskId,
                    newPage,
                    productName,
                    productType,
                    pdf,
                    signalRLogger
                );

                cancellationToken.ThrowIfCancellationRequested();
                await ticketTemplateContainer.TicketTemplateSelectorAsync(
                    taskId,
                    newPage,
                    ticketTemplate,
                    productType,
                    signalRLogger
                );

                cancellationToken.ThrowIfCancellationRequested();
                Console.WriteLine($"[Task {taskId}] Product {productName} processing completed.");
                await signalRLogger(
                    $"[ProcessProducts Task {taskId}] Successfully processed data for product: {productName}. Ready for save."
                );
                return newPage;
            }
            catch (OperationCanceledException)
            {
                Console.WriteLine(
                    $"[Task {taskId}] [Error] Processing for product {productName} was cancelled."
                );
                await signalRLogger(
                    $"[ProcessProducts Task {taskId}] [Error] Processing cancelled for product: {productName}"
                );
                if (newPage != null && !newPage.IsClosed)
                    await newPage.CloseAsync();
                throw;
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"[Task {taskId}] [Error] Error processing product {productName} before save: {ex.Message}"
                );
                await signalRLogger(
                    $"[USER] SAVE_FAIL: [Task {taskId}] [Fail] Product '{productName}' - Error during save: {ex.Message.Split('\n')[0]}"
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
                            $"[Task {taskId}] [Error] Error closing detail page for {productName} after processing error: {closeEx.Message}"
                        );
                        await signalRLogger(
                            $"[ProcessProducts Task {taskId}] [Error] Error closing detail page for {productName}: {closeEx.Message.Split('\n')[0]}"
                        );
                    }
                }
                return null;
            }
            finally
            {
                var endMessage =
                    $"[Task {taskId} - {DateTime.Now:HH:mm:ss.fff}] ProcessProductsAsync END for: {productName}. New page is {(newPage != null && !newPage.IsClosed ? "available" : "null or closed")}.";
                Console.WriteLine(endMessage);
                await signalRLogger($"[ProcessProducts] {endMessage}");
            }
        }
    }
}
