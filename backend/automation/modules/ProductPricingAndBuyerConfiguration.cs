using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Playwright;
using Newtonsoft.Json.Linq;

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

        private const string GenericCopyRangeButtonSelector = "img[title='Copy Range']";

        private const string GenericPasteAllButtonSelector = "img[title='Paste All']";

        private const string PasteAllButtonEnabledSrc =
            "https://store.bender-inc.com/dsf/images/icon/icon_paste_all.gif";

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
            string valueToSet,
            Func<string, Task> signalRLogger,
            string fieldName
        )
        {
            var locator = page.Locator(selector);
            string currentValue;
            int maxRetries = 3;
            int attempt = 0;

            do
            {
                attempt++;
                try
                {
                    await locator.FillAsync(valueToSet ?? "");

                    await page.WaitForTimeoutAsync(100);
                    currentValue = await locator.InputValueAsync() ?? "";

                    if (currentValue == (valueToSet ?? ""))
                    {
                        await signalRLogger(
                            $"[Task {taskId}] [ClearAndFillAsync] Successfully filled and verified {fieldName} ('{selector}') with '{valueToSet}' on attempt {attempt}."
                        );
                        Console.WriteLine(
                            $"[ClearAndFillAsync] Successfully filled and verified {fieldName} ('{selector}') with '{valueToSet}' on attempt {attempt}."
                        );
                        return;
                    }
                    else
                    {
                        await signalRLogger(
                            $"[Task {taskId}] [ClearAndFillAsync] Attempt {attempt}: {fieldName} ('{selector}') filled with '{valueToSet}', but current value is '{currentValue}'. Retrying..."
                        );
                        Console.WriteLine(
                            $"[ClearAndFillAsync] Attempt {attempt}: {fieldName} ('{selector}') filled with '{valueToSet}', but current value is '{currentValue}'. Retrying..."
                        );
                    }
                }
                catch (Exception ex)
                {
                    await signalRLogger(
                        $"[Task {taskId}] [ClearAndFillAsync] Attempt {attempt}: Error filling {fieldName} ('{selector}'): {ex.Message}"
                    );
                    Console.WriteLine(
                        $"[ClearAndFillAsync] Attempt {attempt}: Error filling {fieldName} ('{selector}'): {ex.Message}"
                    );
                    if (attempt >= maxRetries)
                        throw;
                }
            } while (attempt < maxRetries);

            await signalRLogger(
                $"[Task {taskId}] [ClearAndFillAsync] Failed to set {fieldName} ('{selector}') to '{valueToSet}' after {maxRetries} attempts. Final value: '{await locator.InputValueAsync() ?? ""}'."
            );
            Console.WriteLine(
                $"[ClearAndFillAsync] Failed to set {fieldName} ('{selector}') to '{valueToSet}' after {maxRetries} attempts. Final value: '{await locator.InputValueAsync() ?? ""}'."
            );
            throw new Exception(
                $"Failed to set {fieldName} ('{selector}') to '{valueToSet}' after {maxRetries} attempts."
            );
        }

        private async Task<bool> ProductPriceMatchesAsync(
            int taskId,
            IPage page,
            JArray startingRanges,
            JArray endingRanges,
            JArray regularPricesArr,
            JArray setupPricesArr,
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
                int expectedTierCount = startingRanges.Count;

                if (
                    expectedTierCount > 0
                    && (
                        endingRanges.Count != expectedTierCount
                        || regularPricesArr.Count != expectedTierCount
                        || setupPricesArr.Count != expectedTierCount
                    )
                )
                {
                    await signalRLogger(
                        $"[Task {taskId}] [ProductPriceMatchesAsync] Mismatch in tier counts among input JArrays. SR:{startingRanges.Count}, ER:{endingRanges.Count}, RP:{regularPricesArr.Count}, SP:{setupPricesArr.Count}. Prices do not match."
                    );
                    return false;
                }

                if (expectedTierCount == 0)
                {
                    var firstTierBeginRangeLocator = page.Locator(
                        $"{BeginRangeInputBaseSelector}1"
                    );
                    if (await firstTierBeginRangeLocator.CountAsync() == 0)
                    {
                        await signalRLogger(
                            $"[Task {taskId}] [ProductPriceMatchesAsync] No price tiers expected (JArrays empty) and no first-tier inputs found on page. Prices match (as in, nothing to mismatch)."
                        );
                        return true;
                    }
                    else
                    {
                        await signalRLogger(
                            $"[Task {taskId}] [ProductPriceMatchesAsync] No price tiers expected (JArrays empty), but first-tier inputs found on page. Prices do not match."
                        );
                        return false;
                    }
                }

                for (int i = 0; i < expectedTierCount; i++)
                {
                    string tierSuffix = (i + 1).ToString();
                    string expectedSR = startingRanges[i]?.ToString().Trim() ?? "";
                    string expectedER = endingRanges[i]?.ToString().Trim() ?? "";
                    string expectedRP = regularPricesArr[i]?.ToString().Trim() ?? "";
                    string expectedSP = setupPricesArr[i]?.ToString().Trim() ?? "";

                    string srSelector = $"{BeginRangeInputBaseSelector}{tierSuffix}";
                    string erSelector = $"{EndRangeInputBaseSelector}{tierSuffix}";
                    string rpSelector = $"{RegularPriceInputBaseSelector}{tierSuffix}";
                    string spSelector = $"{SetupPriceInputBaseSelector}{tierSuffix}";

                    var srLocator = page.Locator(srSelector);
                    var erLocator = page.Locator(erSelector);
                    var rpLocator = page.Locator(rpSelector);
                    var spLocator = page.Locator(spSelector);

                    if (await srLocator.CountAsync() == 0)
                    {
                        await signalRLogger(
                            $"[Task {taskId}] [ProductPriceMatchesAsync] Tier {i + 1}: Starting Range input ('{srSelector}') not found. Prices do not match."
                        );
                        return false;
                    }
                    if (await erLocator.CountAsync() == 0)
                    {
                        await signalRLogger(
                            $"[Task {taskId}] [ProductPriceMatchesAsync] Tier {i + 1}: Ending Range input ('{erSelector}') not found. Prices do not match."
                        );
                        return false;
                    }
                    if (await rpLocator.CountAsync() == 0)
                    {
                        await signalRLogger(
                            $"[Task {taskId}] [ProductPriceMatchesAsync] Tier {i + 1}: Regular Price input ('{rpSelector}') not found. Prices do not match."
                        );
                        return false;
                    }
                    if (await spLocator.CountAsync() == 0)
                    {
                        await signalRLogger(
                            $"[Task {taskId}] [ProductPriceMatchesAsync] Tier {i + 1}: Setup Price input ('{spSelector}') not found. Prices do not match."
                        );
                        return false;
                    }

                    string actualSR = (await srLocator.First.InputValueAsync() ?? "").Trim();
                    string actualER = (await erLocator.First.InputValueAsync() ?? "").Trim();
                    string actualRP = (await rpLocator.First.InputValueAsync() ?? "").Trim();
                    string actualSP = (await spLocator.First.InputValueAsync() ?? "").Trim();

                    if (
                        actualSR != expectedSR
                        || actualER != expectedER
                        || actualRP != expectedRP
                        || actualSP != expectedSP
                    )
                    {
                        await signalRLogger(
                            $"[Task {taskId}] [ProductPriceMatchesAsync] Tier {i + 1}: Values do not match. "
                                + $"SR: Expected='{expectedSR}', Got='{actualSR}'. "
                                + $"ER: Expected='{expectedER}', Got='{actualER}'. "
                                + $"RP: Expected='{expectedRP}', Got='{actualRP}'. "
                                + $"SP: Expected='{expectedSP}', Got='{actualSP}'."
                        );
                        Console.WriteLine(
                            $"[ProductPriceMatchesAsync] Tier {i + 1}: Values do not match. "
                                + $"SR: Expected='{expectedSR}', Got='{actualSR}'. "
                                + $"ER: Expected='{expectedER}', Got='{actualER}'. "
                                + $"RP: Expected='{expectedRP}', Got='{actualRP}'. "
                                + $"SP: Expected='{expectedSP}', Got='{actualSP}'."
                        );
                        return false;
                    }
                }

                await signalRLogger(
                    $"[Task {taskId}] [ProductPriceMatchesAsync] All {expectedTierCount} price tiers match the values on the page."
                );
                Console.WriteLine(
                    $"[ProductPriceMatchesAsync] All {expectedTierCount} price tiers match the values on the page."
                );
                return true;
            }
            catch (Exception ex)
            {
                await signalRLogger(
                    $"[Task {taskId}] [ProductPriceMatchesAsync] Exception occurred: {ex.Message}. Assuming prices do not match."
                );
                Console.WriteLine(
                    $"[ProductPriceMatchesAsync] Exception occurred: {ex.Message}. Assuming prices do not match."
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

            if (currentRanges != targetRanges && !string.IsNullOrEmpty(endingRange))
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
                else if (currentRanges < targetRanges && !string.IsNullOrEmpty(endingRange))
                {
                    await signalRLogger(
                        $"[Task {taskId}] [FillPricingFormAsync] Adding {targetRanges - currentRanges} missing range(s)."
                    );
                    Console.WriteLine(
                        $"[FillPricingFormAsync] Adding {targetRanges - currentRanges} missing range(s)."
                    );
                }
            }
            else
            {
                await signalRLogger(
                    $"[Task {taskId}] [FillPricingFormAsync] Starting range and ending range are empty or not found. Skipping."
                );
                Console.WriteLine(
                    "[FillPricingFormAsync] Starting range and ending range are empty or not found. Skipping."
                );
            }

            if (currentRanges != targetRanges && !string.IsNullOrEmpty(endingRange))
            {
                int rangesToAdd = targetRanges;
                await signalRLogger(
                    $"[Task {taskId}] [FillPricingFormAsync] Adding {rangesToAdd} missing range(s)."
                );
                Console.WriteLine($"[FillPricingFormAsync] Adding {rangesToAdd} missing range(s).");

                for (int i = 0; i < rangesToAdd - 1; i++)
                {
                    await page.Locator(AddRangeButtonSelector).ClickAsync();

                    await signalRLogger(
                        $"[Task {taskId}] [FillPricingFormAsync] Added range offset: {i + 1}"
                    );
                    Console.WriteLine($"[FillPricingFormAsync] Added range offset: {i + 1}");
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

                    for (int i = 0; i < erTierCount - 1; i++)
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

            var firstCopyButtonLocator = page.Locator(GenericCopyRangeButtonSelector).First;

            await signalRLogger(
                $"[Task {taskId}] [FillPricingFormAsync] Targeting first 'Copy Range' button using selector: '{GenericCopyRangeButtonSelector}'."
            );
            Console.WriteLine($"[FillPricingFormAsync] Targeting first 'Copy Range' button.");

            try
            {
                await firstCopyButtonLocator.WaitForAsync(
                    new LocatorWaitForOptions
                    {
                        State = WaitForSelectorState.Visible,
                        Timeout = 5000,
                    }
                );
                await Assertions
                    .Expect(firstCopyButtonLocator)
                    .ToBeEnabledAsync(new LocatorAssertionsToBeEnabledOptions { Timeout = 5000 });
                await signalRLogger(
                    $"[Task {taskId}] [FillPricingFormAsync] First 'Copy Range' button is visible and enabled."
                );

                await firstCopyButtonLocator.ClickAsync();
                await signalRLogger(
                    $"[Task {taskId}] [FillPricingFormAsync] Clicked first 'Copy Range' button."
                );
                Console.WriteLine("[FillPricingFormAsync] Clicked first 'Copy Range' button.");
            }
            catch (PlaywrightException ex)
            {
                string copyErrorMsg =
                    $"[Task {taskId}] [FillPricingFormAsync] Error with first 'Copy Range' button (selector '{GenericCopyRangeButtonSelector}'). It might not be visible/enabled or another issue occurred. Error: {ex.Message}";
                await signalRLogger(copyErrorMsg);
                Console.WriteLine(copyErrorMsg);
                throw new Exception("First 'Copy Range' button was not actionable.", ex);
            }

            var firstPasteAllButtonLocator = page.Locator(GenericPasteAllButtonSelector).First;

            await signalRLogger(
                $"[Task {taskId}] [FillPricingFormAsync] Targeting first 'Paste All' button using selector: '{GenericPasteAllButtonSelector}'. Waiting for it to become 'enabled' (src change)."
            );
            Console.WriteLine(
                $"[FillPricingFormAsync] Targeting first 'Paste All' button. Waiting for src change."
            );

            try
            {
                await firstPasteAllButtonLocator.WaitForAsync(
                    new LocatorWaitForOptions
                    {
                        State = WaitForSelectorState.Visible,
                        Timeout = 5000,
                    }
                );
                await signalRLogger(
                    $"[Task {taskId}] [FillPricingFormAsync] First 'Paste All' button is visible."
                );

                const float attributeTimeout = 10000f;
                await Assertions
                    .Expect(firstPasteAllButtonLocator)
                    .ToHaveAttributeAsync(
                        "src",
                        PasteAllButtonEnabledSrc,
                        new LocatorAssertionsToHaveAttributeOptions { Timeout = attributeTimeout }
                    );

                await signalRLogger(
                    $"[Task {taskId}] [FillPricingFormAsync] First 'Paste All' button 'src' attribute updated to enabled version. Assuming it's clickable."
                );
                Console.WriteLine(
                    "[FillPricingFormAsync] First 'Paste All' button 'src' attribute updated. Assuming it's clickable."
                );

                await firstPasteAllButtonLocator.ClickAsync();
                await signalRLogger(
                    $"[Task {taskId}] [FillPricingFormAsync] Clicked first 'Paste All' button."
                );
                Console.WriteLine("[FillPricingFormAsync] Clicked first 'Paste All' button.");
            }
            catch (PlaywrightException ex)
            {
                string currentSrc = "attribute not found or error";
                try
                {
                    if (await firstPasteAllButtonLocator.CountAsync() > 0)
                    {
                        currentSrc =
                            await firstPasteAllButtonLocator.GetAttributeAsync("src") ?? "null";
                    }
                }
                catch (Exception getAttributeEx)
                {
                    currentSrc = $"error getting attribute: {getAttributeEx.Message}";
                }

                string pasteErrorMsg =
                    $"[Task {taskId}] [FillPricingFormAsync] First 'Paste All' button (selector '{GenericPasteAllButtonSelector}') did not update its 'src' attribute to '{PasteAllButtonEnabledSrc}' within timeout or other error. Current src: '{currentSrc}'. Error: {ex.Message}";
                await signalRLogger(pasteErrorMsg);
                Console.WriteLine(pasteErrorMsg);
                throw new Exception(
                    "First 'Paste All' button did not become actionable (src attribute check failed).",
                    ex
                );
            }
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

                            Func<string, JArray> convertToJArray = (priceString) =>
                                new JArray(
                                    (priceString ?? "")
                                        .Split(',')
                                        .Select(s => s.Trim())
                                        .Where(s => !string.IsNullOrEmpty(s))
                                        .Cast<object>()
                                        .ToArray()
                                );

                            JArray rangeStartJA = convertToJArray(rangeStart);
                            JArray rangeEndJA = convertToJArray(rangeEnd);
                            JArray regularPriceJA = convertToJArray(regularPrice);
                            JArray setupPriceJA = convertToJArray(setupPrice);

                            bool pricesMatch = await ProductPriceMatchesAsync(
                                taskId,
                                page,
                                rangeStartJA,
                                rangeEndJA,
                                regularPriceJA,
                                setupPriceJA,
                                signalRLogger
                            );

                            bool shouldFillForm = !pricesMatch;
                            if (!shouldFillForm && rangeStartJA.Count > 0) { }

                            if (shouldFillForm)
                            {
                                await signalRLogger(
                                    $"[Task {taskId}] Prices do not match. Filling pricing form."
                                );
                                Console.WriteLine("Prices do not match. Filling pricing form.");
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
                                    $"[Task {taskId}] Prices match. Skipping pricing form fill."
                                );
                                Console.WriteLine("Prices match. Skipping pricing form fill.");
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
