using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Playwright;

namespace backend.automation.modules
{
    public class ProductPricingAndBuyerConfiguration
    {
        private const string PricingTabSelector = "#TabPricing";
        private const string SettingsTabSelector = "#TabSettings";
        private const string AllowBuyerConfigNoSelector =
            "#ctl00_ctl00_C_M_ctl00_W_ctl01_AllowBuyerConfigurationRadioButton_1";
        private const string AllowBuyerConfigYesSelector =
            "#ctl00_ctl00_C_M_ctl00_W_ctl01_AllowBuyerConfigurationRadioButton_0";

        private const string DeleteRangeButtonSelector =
            "img[onclick^='Javascript:delRow'][height='17'][width='16']";
        private const string AddRangeButtonSelector =
            "#ctl00_ctl00_C_M_ctl00_W_ctl01_GridViewPricesheets_ctl02_PriceItemFrame_imageplushid_PriceCatalog";
        private const string CopyRangeButtonSelector = "img[title='Copy Range']";
        private const string PasteAllButtonSelector = "img[title='Paste All']";

        private const string BeginRangeInputBaseSelector = "#tbl_0_PriceCatalog_rngbegin_";
        private const string EndRangeInputBaseSelector = "#tbl_0_PriceCatalog_rngend_";
        private const string RegularPriceInputBaseSelector = "#tbl_0_PriceCatalog_regularprice_";
        private const string SetupPriceInputBaseSelector = "#tbl_0_PriceCatalog_setupprice_";

        private async Task<int> DetectMultipleRangesAsync(
            int taskId,
            IPage page,
            Func<string, Task> signalRLogger
        )
        {
            var deleteButtons = page.Locator(DeleteRangeButtonSelector);
            int count = await deleteButtons.CountAsync();
            await signalRLogger(
                $"[Task {taskId}] [DetectMultipleRangesAsync] Detected {count} existing price ranges (delete buttons)."
            );
            Console.WriteLine(
                $"[DetectMultipleRangesAsync] Detected {count} existing price ranges (delete buttons)."
            );
            return count;
        }

        private async Task<int> DetectCompositeProductAsync(
            int taskId,
            string? priceValue,
            Func<string, Task> signalRLogger
        )
        {
            if (string.IsNullOrEmpty(priceValue))
            {
                await signalRLogger(
                    $"[Task {taskId}] [DetectCompositeProductAsync] Price value is null or empty, assuming 1 tier."
                );
                Console.WriteLine(
                    "[DetectCompositeProductAsync] Price value is null or empty, assuming 1 tier."
                );
                return 1;
            }

            if (priceValue.Contains(","))
            {
                int count = priceValue.Split(',').Length;
                await signalRLogger(
                    $"[Task {taskId}] [DetectCompositeProductAsync] Composite price value '{priceValue}' detected with {count} tiers."
                );
                Console.WriteLine(
                    $"[DetectCompositeProductAsync] Composite price value '{priceValue}' detected with {count} tiers."
                );
                return count;
            }

            await signalRLogger(
                $"[Task {taskId}] [DetectCompositeProductAsync] Price value '{priceValue}' is not composite, assuming 1 tier."
            );
            Console.WriteLine(
                $"[DetectCompositeProductAsync] Price value '{priceValue}' is not composite, assuming 1 tier."
            );
            return 1;
        }

        private async Task ClearAndFillAsync(
            int taskId,
            IPage page,
            string selector,
            string value,
            Func<string, Task> signalRLogger,
            string fieldName
        )
        {
            var locator = page.Locator(selector);
            try
            {
                await locator.FillAsync(value ?? "");
                await signalRLogger(
                    $"[Task {taskId}] [ClearAndFillAsync] Successfully filled {fieldName} ('{selector}') with '{value}'."
                );
                Console.WriteLine(
                    $"[ClearAndFillAsync] Successfully filled {fieldName} ('{selector}') with '{value}'."
                );
            }
            catch (Exception ex)
            {
                await signalRLogger(
                    $"[Task {taskId}] [ClearAndFillAsync] Error filling {fieldName} ('{selector}'): {ex.Message}"
                );
                Console.WriteLine(
                    $"[ClearAndFillAsync] Error filling {fieldName} ('{selector}'): {ex.Message}"
                );
            }
        }

        private async Task<bool> ProductPriceMatchesAsync(
            int taskId,
            IPage page,
            string startingRange,
            string endingRange,
            string regularPrices,
            string setupPrices,
            Func<string, Task> signalRLogger
        )
        {
            await signalRLogger(
                $"[Task {taskId}] [ProductPriceMatchesAsync] Attempting to match product prices on page."
            );
            Console.WriteLine(
                "[ProductPriceMatchesAsync] Attempting to match product prices on page."
            );

            try
            {
                string beginRangeSelector = $"input[value=\"{startingRange}\"]";
                string endRangeSelector = $"input[value=\"{endingRange}\"]";
                string regularPriceSelector = $"input[value=\"{regularPrices}\"]";
                string setupPriceSelector = $"input[value=\"{setupPrices}\"]";

                var srLocator = page.Locator(beginRangeSelector);
                var erLocator = page.Locator(endRangeSelector);
                var rpLocator = page.Locator(regularPriceSelector);
                var spLocator = page.Locator(setupPriceSelector);

                if (
                    await srLocator.CountAsync() == 0
                    || await erLocator.CountAsync() == 0
                    || await rpLocator.CountAsync() == 0
                    || await spLocator.CountAsync() == 0
                )
                {
                    await signalRLogger(
                        $"[Task {taskId}] [ProductPriceMatchesAsync] One or more price input elements not found with the expected values. Prices do not match."
                    );
                    Console.WriteLine(
                        "[ProductPriceMatchesAsync] One or more price input elements not found with the expected values. Prices do not match."
                    );
                    return false;
                }

                string startingRangeEvaluation = (
                    await srLocator.First.InputValueAsync() ?? ""
                ).Trim();
                string endingRangeEvaluation = (
                    await erLocator.First.InputValueAsync() ?? ""
                ).Trim();
                string regularPriceEvaluation = (
                    await rpLocator.First.InputValueAsync() ?? ""
                ).Trim();
                string setupPriceEvaluation = (
                    await spLocator.First.InputValueAsync() ?? ""
                ).Trim();

                if (
                    startingRangeEvaluation == startingRange
                    && endingRangeEvaluation == endingRange
                    && regularPriceEvaluation == regularPrices
                    && setupPriceEvaluation == setupPrices
                )
                {
                    await signalRLogger(
                        $"[Task {taskId}] [ProductPriceMatchesAsync] Product matches price range and prices: {startingRange} - {endingRange}, Regular: {regularPriceEvaluation}, Setup: {setupPriceEvaluation}. Skipping!"
                    );
                    Console.WriteLine(
                        $"[ProductPriceMatchesAsync] Product matches price range and prices: {startingRange} - {endingRange}, Regular: {regularPriceEvaluation}, Setup: {setupPriceEvaluation}. Skipping!"
                    );
                    return true;
                }
                else
                {
                    await signalRLogger(
                        $"[Task {taskId}] [ProductPriceMatchesAsync] Values retrieved do not perfectly match. Prices do not match."
                    );
                    Console.WriteLine(
                        $"[ProductPriceMatchesAsync] Values retrieved do not perfectly match. Prices do not match."
                    );
                    return false;
                }
            }
            catch (Exception ex)
            {
                await signalRLogger(
                    $"[Task {taskId}] [ProductPriceMatchesAsync] Exception occurred: Product does not match price range and prices. Error: {ex.Message}"
                );
                Console.WriteLine(
                    $"[ProductPriceMatchesAsync] Exception occurred: Product does not match price range and prices. Error: {ex.Message}"
                );
                return false;
            }
        }

        private async Task FillPricingFormAsync(
            int taskId,
            IPage page,
            string startingRange,
            string endingRange,
            string regularPrices,
            string setupPrices,
            Func<string, Task> signalRLogger
        )
        {
            await signalRLogger($"[Task {taskId}] [FillPricingFormAsync] Procedure called.");
            Console.WriteLine("[FillPricingFormAsync] Procedure called.");

            int currentRanges = await DetectMultipleRangesAsync(taskId, page, signalRLogger);
            int targetRanges = await DetectCompositeProductAsync(
                taskId,
                endingRange,
                signalRLogger
            );

            await signalRLogger(
                $"[Task {taskId}] [FillPricingFormAsync] Current ranges: {currentRanges}, Target ranges based on endingRange: {targetRanges}"
            );
            Console.WriteLine(
                $"[FillPricingFormAsync] Current ranges: {currentRanges}, Target ranges based on endingRange: {targetRanges}"
            );

            if (currentRanges != targetRanges)
            {
                await signalRLogger(
                    $"[Task {taskId}] [FillPricingFormAsync] Mismatch detected. Adjusting ranges. Current: {currentRanges}, Target: {targetRanges}"
                );
                Console.WriteLine(
                    $"[FillPricingFormAsync] Mismatch detected. Adjusting ranges. Current: {currentRanges}, Target: {targetRanges}"
                );
                if (currentRanges > targetRanges)
                {
                    int rangesToDelete = currentRanges - targetRanges;
                    await signalRLogger(
                        $"[Task {taskId}] [FillPricingFormAsync] Deleting {rangesToDelete} excess range(s)."
                    );
                    Console.WriteLine(
                        $"[FillPricingFormAsync] Deleting {rangesToDelete} excess range(s)."
                    );
                    for (int i = 0; i < rangesToDelete; i++)
                    {
                        await page.Locator(DeleteRangeButtonSelector).First.ClickAsync();

                        await signalRLogger(
                            $"[Task {taskId}] [FillPricingFormAsync] Deleted range offset: {i + 1}"
                        );
                        Console.WriteLine($"[FillPricingFormAsync] Deleted range offset: {i + 1}");
                    }
                }
                else
                {
                    int rangesToAdd = targetRanges - currentRanges;
                    await signalRLogger(
                        $"[Task {taskId}] [FillPricingFormAsync] Adding {rangesToAdd} missing range(s)."
                    );
                    Console.WriteLine(
                        $"[FillPricingFormAsync] Adding {rangesToAdd} missing range(s)."
                    );
                    for (int i = 0; i < rangesToAdd; i++)
                    {
                        await page.Locator(AddRangeButtonSelector).ClickAsync();

                        await signalRLogger(
                            $"[Task {taskId}] [FillPricingFormAsync] Added range offset: {i + 1}"
                        );
                        Console.WriteLine($"[FillPricingFormAsync] Added range offset: {i + 1}");
                    }
                }
            }
            else
            {
                await signalRLogger(
                    $"[Task {taskId}] [FillPricingFormAsync] Number of ranges ({currentRanges}) matches target ({targetRanges}). No additions/deletions needed."
                );
                Console.WriteLine(
                    $"[FillPricingFormAsync] Number of ranges ({currentRanges}) matches target ({targetRanges}). No additions/deletions needed."
                );
            }

            if (!string.IsNullOrEmpty(startingRange))
            {
                int srTierCount = await DetectCompositeProductAsync(
                    taskId,
                    startingRange,
                    signalRLogger
                );
                string[] srValues = startingRange.Split(',');
                if (srTierCount > 1)
                {
                    await signalRLogger(
                        $"[Task {taskId}] [FillPricingFormAsync] Composite starting range detected ({srTierCount} tiers)."
                    );
                    Console.WriteLine(
                        $"[FillPricingFormAsync] Composite starting range detected ({srTierCount} tiers)."
                    );
                    for (int i = 0; i < srTierCount; i++)
                    {
                        string selector = $"{BeginRangeInputBaseSelector}{i + 1}";
                        await ClearAndFillAsync(
                            taskId,
                            page,
                            selector,
                            srValues[i].Trim(),
                            signalRLogger,
                            $"Starting Range Tier {i + 1}"
                        );
                    }
                }
                else
                {
                    await signalRLogger(
                        $"[Task {taskId}] [FillPricingFormAsync] Single starting range detected."
                    );
                    Console.WriteLine("[FillPricingFormAsync] Single starting range detected.");
                    string selector = $"{BeginRangeInputBaseSelector}1";
                    await ClearAndFillAsync(
                        taskId,
                        page,
                        selector,
                        startingRange.Trim(),
                        signalRLogger,
                        "Starting Range Tier 1"
                    );
                }
            }
            else
            {
                await signalRLogger(
                    $"[Task {taskId}] [FillPricingFormAsync] Starting Range field empty or not found. Skipping."
                );
                Console.WriteLine(
                    "[FillPricingFormAsync] Starting Range field empty or not found. Skipping."
                );
            }

            if (!string.IsNullOrEmpty(endingRange))
            {
                int erTierCount = await DetectCompositeProductAsync(
                    taskId,
                    endingRange,
                    signalRLogger
                );
                string[] erValues = endingRange.Split(',');
                if (erTierCount > 1)
                {
                    await signalRLogger(
                        $"[Task {taskId}] [FillPricingFormAsync] Composite ending range detected ({erTierCount} tiers)."
                    );
                    Console.WriteLine(
                        $"[FillPricingFormAsync] Composite ending range detected ({erTierCount} tiers)."
                    );
                    for (int i = 0; i < erTierCount; i++)
                    {
                        string selector = $"{EndRangeInputBaseSelector}{i + 1}";
                        await ClearAndFillAsync(
                            taskId,
                            page,
                            selector,
                            erValues[i].Trim(),
                            signalRLogger,
                            $"Ending Range Tier {i + 1}"
                        );
                    }
                }
                else
                {
                    await signalRLogger(
                        $"[Task {taskId}] [FillPricingFormAsync] Single ending range detected."
                    );
                    Console.WriteLine("[FillPricingFormAsync] Single ending range detected.");
                    string selector = $"{EndRangeInputBaseSelector}1";
                    await ClearAndFillAsync(
                        taskId,
                        page,
                        selector,
                        endingRange.Trim(),
                        signalRLogger,
                        "Ending Range Tier 1"
                    );
                }
            }
            else
            {
                await signalRLogger(
                    $"[Task {taskId}] [FillPricingFormAsync] Ending Range field empty or not found. Skipping."
                );
                Console.WriteLine(
                    "[FillPricingFormAsync] Ending Range field empty or not found. Skipping."
                );
            }

            if (!string.IsNullOrEmpty(regularPrices))
            {
                int rpTierCount = await DetectCompositeProductAsync(
                    taskId,
                    regularPrices,
                    signalRLogger
                );
                string[] rpValues = regularPrices.Split(',');
                if (rpTierCount > 1)
                {
                    await signalRLogger(
                        $"[Task {taskId}] [FillPricingFormAsync] Composite regular prices detected ({rpTierCount} tiers)."
                    );
                    Console.WriteLine(
                        $"[FillPricingFormAsync] Composite regular prices detected ({rpTierCount} tiers)."
                    );
                    for (int i = 0; i < rpTierCount; i++)
                    {
                        string selector = $"{RegularPriceInputBaseSelector}{i + 1}";
                        await ClearAndFillAsync(
                            taskId,
                            page,
                            selector,
                            rpValues[i].Trim(),
                            signalRLogger,
                            $"Regular Price Tier {i + 1}"
                        );
                    }
                }
                else
                {
                    await signalRLogger(
                        $"[Task {taskId}] [FillPricingFormAsync] Single regular price detected."
                    );
                    Console.WriteLine("[FillPricingFormAsync] Single regular price detected.");
                    string selector = $"{RegularPriceInputBaseSelector}1";
                    await ClearAndFillAsync(
                        taskId,
                        page,
                        selector,
                        regularPrices.Trim(),
                        signalRLogger,
                        "Regular Price Tier 1"
                    );
                }
            }
            else
            {
                await signalRLogger(
                    $"[Task {taskId}] [FillPricingFormAsync] Regular Prices field empty or not found. Skipping."
                );
                Console.WriteLine(
                    "[FillPricingFormAsync] Regular Prices field empty or not found. Skipping."
                );
            }

            if (!string.IsNullOrEmpty(setupPrices))
            {
                int spTierCount = await DetectCompositeProductAsync(
                    taskId,
                    setupPrices,
                    signalRLogger
                );
                string[] spValues = setupPrices.Split(',');
                if (spTierCount > 1)
                {
                    await signalRLogger(
                        $"[Task {taskId}] [FillPricingFormAsync] Composite setup prices detected ({spTierCount} tiers)."
                    );
                    Console.WriteLine(
                        $"[FillPricingFormAsync] Composite setup prices detected ({spTierCount} tiers)."
                    );
                    for (int i = 0; i < spTierCount; i++)
                    {
                        string selector = $"{SetupPriceInputBaseSelector}{i + 1}";
                        await ClearAndFillAsync(
                            taskId,
                            page,
                            selector,
                            spValues[i].Trim(),
                            signalRLogger,
                            $"Setup Price Tier {i + 1}"
                        );
                    }
                }
                else
                {
                    await signalRLogger(
                        $"[Task {taskId}] [FillPricingFormAsync] Single setup price detected."
                    );
                    Console.WriteLine("[FillPricingFormAsync] Single setup price detected.");
                    string selector = $"{SetupPriceInputBaseSelector}1";
                    await ClearAndFillAsync(
                        taskId,
                        page,
                        selector,
                        setupPrices.Trim(),
                        signalRLogger,
                        "Setup Price Tier 1"
                    );
                }
            }
            else
            {
                await signalRLogger(
                    $"[Task {taskId}] [FillPricingFormAsync] Setup Prices field empty or not found. Skipping."
                );
                Console.WriteLine(
                    "[FillPricingFormAsync] Setup Prices field empty or not found. Skipping."
                );
            }

            await page.Locator(CopyRangeButtonSelector).ClickAsync();
            await signalRLogger($"[Task {taskId}] [FillPricingFormAsync] Clicked 'Copy Range'.");
            Console.WriteLine("[FillPricingFormAsync] Clicked 'Copy Range'.");

            await page.Locator(PasteAllButtonSelector).ClickAsync();
            await signalRLogger($"[Task {taskId}] [FillPricingFormAsync] Clicked 'Paste All'.");
            Console.WriteLine("[FillPricingFormAsync] Clicked 'Paste All'.");
        }

        public async Task ConfigurePricingAndBuyerSettingsAsync(
            int taskId,
            IPage page,
            Func<string, Task> signalRLogger,
            string productType,
            string setupPrice,
            string regularPrice,
            string rangeStart,
            string rangeEnd,
            string buyerConfigs
        )
        {
            if (
                productType == "Static Document"
                || productType == "Ad Hoc"
                || productType == "Non Printed Products"
            )
            {
                if (productType != "Non Printed Products")
                {
                    if (
                        !string.IsNullOrEmpty(setupPrice)
                        || !string.IsNullOrEmpty(regularPrice)
                        || !string.IsNullOrEmpty(rangeStart)
                        || !string.IsNullOrEmpty(rangeEnd)
                    )
                    {
                        var pricingTabLocator = page.Locator(PricingTabSelector);
                        if (await pricingTabLocator.IsVisibleAsync())
                        {
                            await signalRLogger($"[Task {taskId}] Found pricing tab");
                            Console.WriteLine("Found pricing tab");

                            await pricingTabLocator.ClickAsync();
                            await signalRLogger($"[Task {taskId}] Pricing tab clicked!");
                            Console.WriteLine("Pricing tab clicked!");

                            bool pricesMatch = await ProductPriceMatchesAsync(
                                taskId,
                                page,
                                rangeStart,
                                rangeEnd,
                                regularPrice,
                                setupPrice,
                                signalRLogger
                            );

                            float.TryParse(rangeStart, out float flRangeStart);
                            float.TryParse(rangeEnd, out float flRangeEnd);
                            float.TryParse(regularPrice, out float flRegularPrice);
                            float.TryParse(setupPrice, out float flSetupPrice);

                            if (
                                !pricesMatch
                                || (
                                    flRangeStart != 0
                                    && flRangeEnd != 0
                                    && flRegularPrice != 0
                                    && flSetupPrice != 0
                                )
                            )
                            {
                                await signalRLogger(
                                    $"[Task {taskId}] Prices do not match or are non-zero and provided. Filling pricing form."
                                );
                                Console.WriteLine(
                                    "Prices do not match or are non-zero and provided. Filling pricing form."
                                );
                                await FillPricingFormAsync(
                                    taskId,
                                    page,
                                    rangeStart,
                                    rangeEnd,
                                    regularPrice,
                                    setupPrice,
                                    signalRLogger
                                );
                            }
                            else
                            {
                                await signalRLogger(
                                    $"[Task {taskId}] Prices match or relevant fields are zero/empty. Skipping pricing form fill."
                                );
                                Console.WriteLine(
                                    "Prices match or relevant fields are zero/empty. Skipping pricing form fill."
                                );
                            }
                        }
                        else
                        {
                            await signalRLogger(
                                $"[Task {taskId}] Pricing tab not found or not visible."
                            );
                            Console.WriteLine("Pricing tab not found or not visible.");
                        }
                    }
                    else
                    {
                        await signalRLogger(
                            $"[Task {taskId}] Pricing fields (setup, regular, range) are empty. Explicitly skipping pricing tab interaction."
                        );
                        Console.WriteLine(
                            "Pricing fields (setup, regular, range) are empty. Explicitly skipping pricing tab interaction."
                        );
                    }
                }

                var settingsTabLocator = page.Locator(SettingsTabSelector);
                if (await settingsTabLocator.IsVisibleAsync())
                {
                    await signalRLogger($"[Task {taskId}] Found settings tab");
                    Console.WriteLine("Found settings tab");
                    await settingsTabLocator.ClickAsync();
                    await signalRLogger($"[Task {taskId}] Settings tab clicked!");
                    Console.WriteLine("Settings tab clicked!");
                }
                else
                {
                    await signalRLogger($"[Task {taskId}] Settings tab not found or not visible.");
                    Console.WriteLine("Settings tab not found or not visible.");
                }

                if (productType != "Non Printed Products" && productType != "Ad Hoc")
                {
                    if (string.IsNullOrEmpty(buyerConfigs))
                    {
                        await signalRLogger(
                            $"[Task {taskId}] Buyer configuration is set to false (No)."
                        );
                        Console.WriteLine("Buyer configuration is set to false (No).");
                        var allowBuyerNoLocator = page.Locator(AllowBuyerConfigNoSelector);
                        await allowBuyerNoLocator.ClickAsync();

                        bool isChecked = await allowBuyerNoLocator.IsCheckedAsync();
                        if (!isChecked)
                        {
                            await signalRLogger(
                                $"[Task {taskId}] Waiting for 'Allow Buyer Configuration - No' to be checked..."
                            );
                            Console.WriteLine(
                                "Waiting for 'Allow Buyer Configuration - No' to be checked..."
                            );
                            isChecked = await allowBuyerNoLocator.IsCheckedAsync();
                            if (!isChecked)
                            {
                                await signalRLogger(
                                    $"[Task {taskId}] 'Allow Buyer Configuration - No' still not checked after extra check."
                                );
                                Console.WriteLine(
                                    "'Allow Buyer Configuration - No' still not checked after extra check."
                                );
                            }
                            else
                            {
                                await signalRLogger(
                                    $"[Task {taskId}] 'Allow Buyer Configuration - No' is now checked."
                                );
                                Console.WriteLine(
                                    "'Allow Buyer Configuration - No' is now checked."
                                );
                            }
                        }
                        else
                        {
                            await signalRLogger(
                                $"[Task {taskId}] 'Allow Buyer Configuration - No' was checked successfully."
                            );
                            Console.WriteLine(
                                "'Allow Buyer Configuration - No' was checked successfully."
                            );
                        }
                    }
                    else
                    {
                        await signalRLogger(
                            $"[Task {taskId}] Buyer configuration is set to true (Yes)."
                        );
                        Console.WriteLine("Buyer configuration is set to true (Yes).");
                        var allowBuyerYesLocator = page.Locator(AllowBuyerConfigYesSelector);
                        await allowBuyerYesLocator.ClickAsync();

                        bool isChecked = await allowBuyerYesLocator.IsCheckedAsync();
                        if (!isChecked)
                        {
                            await signalRLogger(
                                $"[Task {taskId}] Waiting for 'Allow Buyer Configuration - Yes' to be checked..."
                            );
                            Console.WriteLine(
                                "Waiting for 'Allow Buyer Configuration - Yes' to be checked..."
                            );
                            isChecked = await allowBuyerYesLocator.IsCheckedAsync();
                            if (!isChecked)
                            {
                                await signalRLogger(
                                    $"[Task {taskId}] 'Allow Buyer Configuration - Yes' still not checked after extra check."
                                );
                                Console.WriteLine(
                                    "'Allow Buyer Configuration - Yes' still not checked after extra check."
                                );
                            }
                            else
                            {
                                await signalRLogger(
                                    $"[Task {taskId}] 'Allow Buyer Configuration - Yes' is now checked."
                                );
                                Console.WriteLine(
                                    "'Allow Buyer Configuration - Yes' is now checked."
                                );
                            }
                        }
                        else
                        {
                            await signalRLogger(
                                $"[Task {taskId}] 'Allow Buyer Configuration - Yes' was checked successfully."
                            );
                            Console.WriteLine(
                                "'Allow Buyer Configuration - Yes' was checked successfully."
                            );
                        }
                    }
                }
                else
                {
                    await signalRLogger(
                        $"[Task {taskId}] Product type incompatible with buyer configuration: {productType}, skipping this step."
                    );
                    Console.WriteLine(
                        $"Product type incompatible with buyer configuration: {productType}, skipping this step."
                    );
                }
            }
            else
            {
                await signalRLogger(
                    $"[Task {taskId}] Product type '{productType}' does not match conditions for pricing/buyer config. Skipping."
                );
                Console.WriteLine(
                    $"Product type '{productType}' does not match conditions for pricing/buyer config. Skipping."
                );
            }
            await signalRLogger($"[Task {taskId}] ConfigurePricingAndBuyerSettingsAsync finished.");
            Console.WriteLine("ConfigurePricingAndBuyerSettingsAsync finished.");
        }
    }
}
