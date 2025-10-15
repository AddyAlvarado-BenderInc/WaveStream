using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using Microsoft.Playwright;

namespace backend.automation.modules
{
    public class SettingsTab
    {
        private const string WidthSelectorConst =
            "input[name=\"ctl00$ctl00$C$M$ctl00$W$ctl01$ShipmentDimensionCtrl$_BoxX$_Length\"]";
        private const string LengthSelectorConst =
            "input[name=\"ctl00$ctl00$C$M$ctl00$W$ctl01$ShipmentDimensionCtrl$_BoxY$_Length\"]";
        private const string HeightSelectorConst =
            "input[name=\"ctl00$ctl00$C$M$ctl00$W$ctl01$ShipmentDimensionCtrl$_BoxZ$_Length\"]";
        private const string MaxDimensionSelectorConst =
            "input[name=\"ctl00$ctl00$C$M$ctl00$W$ctl01$ShipmentDimensionCtrl$txtLotSize\"]";

        private static readonly string[] PrintWeightCheckboxSelectors = new[]
        {
            "#ctl00_ctl00_C_M_ctl00_W_ctl01_OptionalPrintWeightCheckbox",
            "input[name='ctl00$ctl00$C$M$ctl00$W$ctl01$OptionalPrintWeightCheckbox']",
            "input[id*='OptionalPrintWeightCheckbox'][type='checkbox']",
            "input[type='checkbox'][onclick*='EnableWeightControl']",
        };

        private static readonly string[] PrintWeightInputSelectors = new[]
        {
            "input[name='ctl00$ctl00$C$M$ctl00$W$ctl01$OptionalPrintWeightSelector_Active$_Weight']",
            "input[id*='OptionalPrintWeightSelector'][id*='_Weight']:not([disabled])",
            "input[name*='OptionalPrintWeightSelector'][name*='_Weight']:not([disabled])",
            "input[type='text'][id*='Weight']:not([disabled])",
        };

        private static readonly string[] PrintWeightMeasurementSelectors = new[]
        {
            "#ctl00_ctl00_C_M_ctl00_W_ctl01_OptionalPrintWeightSelector_Active__Unit",
            "select[name='ctl00$ctl00$C$M$ctl00$W$ctl01$OptionalPrintWeightSelector_Active$_Unit']",
            "select[id*='OptionalPrintWeightSelector'][id*='_Unit']:not([disabled])",
            "select[name*='OptionalPrintWeightSelector'][name*='_Unit']:not([disabled])",
        };

        private const string PrintWeightCheckboxConst =
            "#ctl00_ctl00_C_M_ctl00_W\\$ctl01_OptionalPrintWeightCheckbox";
        private const string PrintWeightInputConst =
            "input[name=\"ctl00$ctl00$C$M$ctl00$W$ctl01$OptionalPrintWeightSelector_Active$_Weight\"]";
        private const string PrintWeightMeasurementConst =
            "#ctl00_ctl00_C_M_ctl00_W\\$ctl01_OptionalPrintWeightSelector_Active__Unit";

        private const string BoxXLabelConst =
            "#ctl00_ctl00_C_M_ctl00_W\\$ctl01_ShipmentDimensionCtrl__lblBoxX";
        private const string BoxYLabelConst =
            "#ctl00_ctl00_C_M_ctl00_W\\$ctl01_ShipmentDimensionCtrl__lblBoxY";
        private const string BoxZLabelConst =
            "#ctl00_ctl00_C_M_ctl00_W\\$ctl01_ShipmentDimensionCtrl__lblBoxZ";
        private const string LotSizeLabelConst =
            "#ctl00_ctl00_C_M_ctl00_W\\$ctl01_ShipmentDimensionCtrl_lblLotSize";

        private async Task<ILocator?> TryFindElementWithFallbackAsync(
            int taskId,
            IPage page,
            string[] selectors,
            string elementName,
            Func<string, Task> signalRLogger,
            int timeoutPerSelector = 3000
        )
        {
            foreach (var selector in selectors)
            {
                try
                {
                    var locator = page.Locator(selector);
                    await locator.WaitForAsync(
                        new LocatorWaitForOptions
                        {
                            State = WaitForSelectorState.Attached,
                            Timeout = timeoutPerSelector,
                        }
                    );
                    await signalRLogger(
                        $"[Task {taskId}] Found {elementName} using selector: {selector}"
                    );
                    Console.WriteLine(
                        $"[Task {taskId}] Found {elementName} using selector: {selector}"
                    );
                    return locator;
                }
                catch (TimeoutException)
                {
                    await signalRLogger(
                        $"[Task {taskId}] Selector '{selector}' not found for {elementName}, trying next..."
                    );
                    Console.WriteLine(
                        $"[Task {taskId}] Selector '{selector}' not found for {elementName}, trying next..."
                    );
                    continue;
                }
            }

            await signalRLogger(
                $"[Task {taskId}] [Error] Could not find {elementName} with any selector. Tried: {string.Join(", ", selectors)}"
            );
            Console.WriteLine(
                $"[Task {taskId}] [Error] Could not find {elementName} with any selector. Tried: {string.Join(", ", selectors)}"
            );
            return null;
        }

        private async Task ClearInputAndTypeAsync(
            int taskId,
            IPage page,
            string selector,
            string valueToType,
            Func<string, Task> signalRLogger,
            string fieldNameForLogging
        )
        {
            var locator = page.Locator(selector);
            try
            {
                await locator.FillAsync(valueToType ?? "");

                if (!string.IsNullOrEmpty(valueToType))
                {
                    await signalRLogger(
                        $"[Task {taskId}] Filled {fieldNameForLogging} with: {valueToType}"
                    );
                }
                else
                {
                    await signalRLogger(
                        $"[Task {taskId}] {fieldNameForLogging} is to be empty, field cleared."
                    );
                }
            }
            catch (Exception ex)
            {
                await signalRLogger(
                    $"[Task {taskId}] [Error] Failed to fill {fieldNameForLogging} ('{selector}') with '{valueToType}'. Error: {ex.Message}"
                );
            }
        }

        public async Task SettingsTabAsync(
            int taskId,
            IPage page,
            Func<string, Task> signalRLogger,
            string productType,
            string advancedRanges,
            string orderQuantities,
            string shippingWidths,
            string shippingHeights,
            string shippingLengths,
            string shippingMaxs,
            string weightInput,
            string maxQuantityInput,
            string showQtyPrice,
            string anyQuantitiesButton =
                "#ctl00_ctl00_C_M_ctl00_W_ctl01_OrderQuantitiesCtrl__AnyQuantities",
            string advancedQuantitiesButton =
                "#ctl00_ctl00_C_M_ctl00_W_ctl01_OrderQuantitiesCtrl__Advanced",
            string inputElement =
                @"input[name=""ctl00$ctl00$C$M$ctl00$W$ctl01$OrderQuantitiesCtrl$_Expression""]",
            string maxQtySelector =
                @"input[name=""ctl00$ctl00$C$M$ctl00$W$ctl01$OrderQuantitiesCtrl$txtMaxOrderQuantityPermitted""]",
            string showQtyPriceSelector = @"input[value=""rdbShowPricing""]"
        )
        {
            if (productType == "Product Matrix")
            {
                await signalRLogger(
                    $"[Task {taskId}] Product Type is '{productType}', skipping Settings Tab."
                );
                return;
            }

            if (!string.IsNullOrEmpty(orderQuantities))
            {
                await signalRLogger($"[Task {taskId}] Order Quantities: {orderQuantities}");

                var anyQuantitiesLocator = page.Locator(anyQuantitiesButton);
                var advancedQuantitiesLocator = page.Locator(advancedQuantitiesButton);

                bool anyQuantitiesVisible = await anyQuantitiesLocator.IsVisibleAsync();
                bool advancedQuantitiesVisible = await advancedQuantitiesLocator.IsVisibleAsync();

                await signalRLogger(
                    $"[Task {taskId}] DEBUG - Any Quantities button visible: {anyQuantitiesVisible}, selector: '{anyQuantitiesButton}'"
                );
                await signalRLogger(
                    $"[Task {taskId}] DEBUG - Advanced Quantities button visible: {advancedQuantitiesVisible}, selector: '{advancedQuantitiesButton}'"
                );

                switch (orderQuantities)
                {
                    case "AnyQuantity":
                        if (anyQuantitiesVisible)
                        {
                            await anyQuantitiesLocator.ClickAsync();
                            await signalRLogger(
                                $"[Task {taskId}] Clicked Any Quantity for selected quantity: {orderQuantities}"
                            );
                        }
                        else
                        {
                            await signalRLogger(
                                $"[Task {taskId}] [Error] Any Quantities button not visible with selector: '{anyQuantitiesButton}'"
                            );
                        }
                        break;
                    case "SpecificQuantity":
                        if (advancedQuantitiesVisible)
                        {
                            await advancedQuantitiesLocator.ClickAsync();
                            await signalRLogger(
                                $"[Task {taskId}] Clicked Advanced Quantities for selected quantity: {orderQuantities}"
                            );

                            await Task.Delay(1000);
                            var inputSelectors = new[]
                            {
                                inputElement,
                                "#ctl00_ctl00_C_M_ctl00_W_ctl01_OrderQuantitiesCtrl__Expression",
                                "input[id*='OrderQuantitiesCtrl__Expression']",
                                "input[name*='OrderQuantitiesCtrl$_Expression']",
                            };

                            ILocator? advancedRangesInputElement = null;
                            string workingSelector = "";

                            foreach (var selector in inputSelectors)
                            {
                                var testLocator = page.Locator(selector);

                                await Task.Delay(500);

                                if (await testLocator.IsVisibleAsync())
                                {
                                    advancedRangesInputElement = testLocator;
                                    workingSelector = selector;
                                    break;
                                }
                                await signalRLogger(
                                    $"[Task {taskId}] DEBUG - Selector '{selector}' not visible, trying next"
                                );
                            }

                            if (advancedRangesInputElement == null)
                            {
                                await signalRLogger(
                                    $"[Task {taskId}] Input element not found immediately, waiting up to 5 seconds..."
                                );

                                try
                                {
                                    var firstSelector = inputSelectors[0];
                                    await page.WaitForSelectorAsync(
                                        firstSelector,
                                        new PageWaitForSelectorOptions { Timeout = 5000 }
                                    );
                                    advancedRangesInputElement = page.Locator(firstSelector);
                                    workingSelector = firstSelector;
                                    await signalRLogger(
                                        $"[Task {taskId}] Found input element after wait with selector: '{workingSelector}'"
                                    );
                                }
                                catch (TimeoutException)
                                {
                                    await signalRLogger(
                                        $"[Task {taskId}] [Error] Timeout waiting for input element to appear"
                                    );
                                }
                            }

                            if (advancedRangesInputElement != null)
                            {
                                await signalRLogger(
                                    $"[Task {taskId}] Found input element for Advanced Ranges with selector: '{workingSelector}'"
                                );
                                await advancedRangesInputElement.FillAsync(advancedRanges ?? "10");

                                var doneButtonLocator = page.Locator(
                                    "#ctl00_ctl00_C_M_ctl00_W_ctl01_OrderQuantitiesCtrl_btnDone"
                                );
                                bool doneButtonVisible = await doneButtonLocator.IsVisibleAsync();
                                await signalRLogger(
                                    $"[Task {taskId}] DEBUG - Done button visible: {doneButtonVisible}"
                                );

                                if (doneButtonVisible)
                                {
                                    await doneButtonLocator.ClickAsync();
                                    await signalRLogger(
                                        $"[Task {taskId}] Filled Advanced Ranges with: {advancedRanges}"
                                    );
                                }
                                else
                                {
                                    await signalRLogger(
                                        $"[Task {taskId}] [Error] Done button not visible after filling advanced ranges"
                                    );
                                }
                            }
                            else
                            {
                                await signalRLogger(
                                    $"[Task {taskId}] [Error] Input Element for Advanced Ranges not found with any of the attempted selectors"
                                );
                            }
                        }
                        else
                        {
                            await signalRLogger(
                                $"[Task {taskId}] [Error] Advanced Quantities button not visible with selector: '{advancedQuantitiesButton}'"
                            );
                        }
                        break;
                    default:
                        await signalRLogger(
                            $"[Task {taskId}] Order Quantities: '{orderQuantities}' - Unknown value. Valid values are 'AnyQuantity' or 'SpecificQuantity'"
                        );
                        if (advancedQuantitiesVisible)
                        {
                            await advancedQuantitiesLocator.ClickAsync();
                            await signalRLogger(
                                $"[Task {taskId}] Defaulted to clicking Advanced Quantities button"
                            );
                        }
                        else
                        {
                            await signalRLogger(
                                $"[Task {taskId}] [Error] Cannot default to Advanced Quantities - button not visible"
                            );
                        }
                        break;
                }
            }
            else
            {
                await signalRLogger(
                    $"[Task {taskId}] Order Quantities not found or not provided, skipping"
                );
            }

            if (!string.IsNullOrEmpty(maxQuantityInput))
            {
                string currentMaxQuantityValueToSet = maxQuantityInput;
                var maxQtyLocator = page.Locator(maxQtySelector);

                if (await maxQtyLocator.IsVisibleAsync())
                {
                    var actualFieldValue = (await maxQtyLocator.InputValueAsync() ?? "").Trim();
                    await signalRLogger(
                        $"[Task {taskId}] Max Quantity field current value: '{actualFieldValue}'"
                    );

                    if (
                        currentMaxQuantityValueToSet.ToLower() == "default"
                        || string.IsNullOrEmpty(currentMaxQuantityValueToSet)
                    )
                    {
                        currentMaxQuantityValueToSet = "";
                    }

                    if (actualFieldValue == currentMaxQuantityValueToSet)
                    {
                        await signalRLogger(
                            $"[Task {taskId}] Max Quantity is already set to: "
                                + (
                                    string.IsNullOrEmpty(currentMaxQuantityValueToSet)
                                        ? "empty"
                                        : currentMaxQuantityValueToSet
                                )
                        );
                    }
                    else
                    {
                        await signalRLogger(
                            $"[Task {taskId}] Max Quantity: Current '{actualFieldValue}', Desired '{currentMaxQuantityValueToSet}'. Updating."
                        );
                        await ClearInputAndTypeAsync(
                            taskId,
                            page,
                            maxQtySelector,
                            currentMaxQuantityValueToSet,
                            signalRLogger,
                            "Max Quantity"
                        );
                    }
                }
                else
                {
                    await signalRLogger(
                        $"[Task {taskId}] [Error] Max Quantity selector ('{maxQtySelector}') not found, skipping"
                    );
                }
            }
            else
            {
                await signalRLogger($"[Task {taskId}] Max Quantity input not provided, skipping");
            }

            if (!string.IsNullOrEmpty(showQtyPrice))
            {
                bool desiredState;
                if (bool.TryParse(showQtyPrice, out desiredState))
                {
                    var showQtyPriceLocator = page.Locator(showQtyPriceSelector);
                    if (await showQtyPriceLocator.IsVisibleAsync())
                    {
                        var isCurrentlyChecked = await showQtyPriceLocator.IsCheckedAsync();
                        await signalRLogger(
                            $"[Task {taskId}] Show Quantity Price current state: {isCurrentlyChecked}, Desired state: {desiredState}"
                        );

                        if (isCurrentlyChecked != desiredState)
                        {
                            await signalRLogger(
                                $"[Task {taskId}] Clicking Show Quantity Price checkbox."
                            );
                            await showQtyPriceLocator.ClickAsync();
                        }
                        else
                        {
                            await signalRLogger(
                                $"[Task {taskId}] Show Quantity Price already set to desired state."
                            );
                        }
                    }
                    else
                    {
                        await signalRLogger(
                            $"[Task {taskId}] [Error] Show Quantity Price selector ('{showQtyPriceSelector}') not found, skipping."
                        );
                    }
                }
                else
                {
                    await signalRLogger(
                        $"[Task {taskId}] [Error] Invalid value for showQtyPrice: {showQtyPrice}. Skipping."
                    );
                }
            }

            await page.EvaluateAsync("() => document.activeElement?.blur()");
            await page.Mouse.ClickAsync(0, 0);

            await signalRLogger($"[Task {taskId}] Scrolling page...");
            if (productType != "Non Printed Products")
            {
                await page.EvaluateAsync("() => window.scrollBy(0, window.innerHeight * 0.5)");
                await Task.Delay(100);
                await page.EvaluateAsync("() => window.scrollBy(0, window.innerHeight * 0.5)");
            }
            else
            {
                await page.EvaluateAsync("() => window.scrollTo(0, document.body.scrollHeight)");
            }
            await Task.Delay(200);
            await signalRLogger($"[Task {taskId}] Scrolling complete.");

            string effectiveWeightInput = string.IsNullOrEmpty(weightInput) ? "0.02" : weightInput;

            if (
                !string.IsNullOrEmpty(weightInput)
                || !string.IsNullOrEmpty(shippingWidths)
                || !string.IsNullOrEmpty(shippingLengths)
                || !string.IsNullOrEmpty(shippingHeights)
                || !string.IsNullOrEmpty(shippingMaxs)
            )
            {
                var printWeightMeasurementLocator = await TryFindElementWithFallbackAsync(
                    taskId,
                    page,
                    PrintWeightMeasurementSelectors,
                    "Print Weight Measurement Unit",
                    signalRLogger
                );

                if (printWeightMeasurementLocator != null && productType != "Ad Hoc")
                {
                    await signalRLogger($"[Task {taskId}] Print weight measurement selector found");

                    try
                    {
                        var currentMeasurementValue =
                            await printWeightMeasurementLocator.InputValueAsync();
                        if (currentMeasurementValue == "0")
                        {
                            await signalRLogger(
                                $"[Task {taskId}] Print weight measurement is oz, changing to lb."
                            );
                            await printWeightMeasurementLocator.SelectOptionAsync(
                                new SelectOptionValue { Value = "1" }
                            );
                        }
                        else
                        {
                            await signalRLogger(
                                $"[Task {taskId}] Print weight measurement already set to lb (or not '0'). Current value: {currentMeasurementValue}"
                            );
                        }
                    }
                    catch (Exception ex)
                    {
                        await signalRLogger(
                            $"[Task {taskId}] [Error] Failed to interact with print weight measurement: {ex.Message}"
                        );
                    }
                }
                else if (productType == "Ad Hoc")
                {
                    await signalRLogger(
                        $"[Task {taskId}] Print weight measurement selector does not exist on Ad Hoc, skipping related weight input logic."
                    );
                }
                else if (productType == "Non Printed Products")
                {
                    await signalRLogger(
                        $"[Task {taskId}] Print weight measurement selector does not exist on Non Printed Products, skipping related weight input logic."
                    );
                }
                else
                {
                    await signalRLogger(
                        $"[Task {taskId}] [Error] Print weight measurement selector not found with any fallback, critical for weight input. Potential error."
                    );
                }

                if (!string.IsNullOrEmpty(weightInput) && productType != "Ad Hoc")
                {
                    await signalRLogger($"[Task {taskId}] Weight input provided: {weightInput}");

                    var printWeightCheckboxLocator = await TryFindElementWithFallbackAsync(
                        taskId,
                        page,
                        PrintWeightCheckboxSelectors,
                        "Print Weight Checkbox",
                        signalRLogger
                    );

                    var printWeightInputLocator = await TryFindElementWithFallbackAsync(
                        taskId,
                        page,
                        PrintWeightInputSelectors,
                        "Print Weight Input",
                        signalRLogger
                    );

                    if (printWeightCheckboxLocator != null && printWeightInputLocator != null)
                    {
                        bool isCheckboxChecked = await printWeightCheckboxLocator.IsCheckedAsync();
                        string currentInputValue = (
                            await printWeightInputLocator.InputValueAsync() ?? ""
                        ).Trim();

                        if (!isCheckboxChecked && currentInputValue == "0")
                        {
                            await signalRLogger(
                                $"[Task {taskId}] Print weight checkbox not checked and input is 0. Clicking checkbox and setting weight to '{effectiveWeightInput}'."
                            );
                            await printWeightCheckboxLocator.ClickAsync();

                            currentInputValue = (
                                await printWeightInputLocator.InputValueAsync() ?? ""
                            ).Trim();
                            if (
                                currentInputValue == "0"
                                || currentInputValue != effectiveWeightInput
                            )
                            {
                                await printWeightInputLocator.FillAsync(effectiveWeightInput);
                                await signalRLogger(
                                    $"[Task {taskId}] Filled Print Weight with: {effectiveWeightInput}"
                                );
                            }
                        }
                        else if (isCheckboxChecked && currentInputValue == effectiveWeightInput)
                        {
                            await signalRLogger(
                                $"[Task {taskId}] Print weight checkbox already checked and weight is correctly set to '{effectiveWeightInput}'. Skipping."
                            );
                        }
                        else if (isCheckboxChecked && currentInputValue != effectiveWeightInput)
                        {
                            await signalRLogger(
                                $"[Task {taskId}] Print weight checkbox checked, but input value '{currentInputValue}' differs from desired '{effectiveWeightInput}'. Updating weight."
                            );
                            await printWeightInputLocator.FillAsync(effectiveWeightInput);
                            await signalRLogger(
                                $"[Task {taskId}] Updated Print Weight to: {effectiveWeightInput}"
                            );
                        }
                        else if (!isCheckboxChecked && currentInputValue != "0")
                        {
                            await signalRLogger(
                                $"[Task {taskId}] Print weight checkbox not checked, but input value is '{currentInputValue}'. Clicking checkbox and ensuring weight is '{effectiveWeightInput}'."
                            );
                            await printWeightCheckboxLocator.ClickAsync();

                            await printWeightInputLocator.FillAsync(effectiveWeightInput);
                            await signalRLogger(
                                $"[Task {taskId}] Filled Print Weight with: {effectiveWeightInput}"
                            );
                        }
                        else
                        {
                            await signalRLogger(
                                $"[Task {taskId}] Print weight state: Checkbox={isCheckboxChecked}, Input='{currentInputValue}'. Desired weight='{effectiveWeightInput}'. Defaulting to ensure correct state."
                            );
                            if (!isCheckboxChecked)
                                await printWeightCheckboxLocator.ClickAsync();

                            await printWeightInputLocator.FillAsync(effectiveWeightInput);
                            await signalRLogger(
                                $"[Task {taskId}] Filled Print Weight with: {effectiveWeightInput}"
                            );
                        }
                    }
                    else
                    {
                        await signalRLogger(
                            $"[Task {taskId}] [Error] Print weight checkbox or input not found, skipping weight input."
                        );
                    }
                }
                else if (productType == "Ad Hoc")
                {
                    await signalRLogger(
                        $"[Task {taskId}] WeightInput skipped for Ad Hoc product type."
                    );
                }
                else
                {
                    await signalRLogger(
                        $"[Task {taskId}] WeightInput not provided, skipping print weight input field."
                    );
                }

                var dimensionFields = new[]
                {
                    new
                    {
                        Name = "Shipping Width",
                        Value = shippingWidths,
                        Selector = WidthSelectorConst,
                        LabelSelector = BoxXLabelConst,
                    },
                    new
                    {
                        Name = "Shipping Length",
                        Value = shippingLengths,
                        Selector = LengthSelectorConst,
                        LabelSelector = BoxYLabelConst,
                    },
                    new
                    {
                        Name = "Shipping Height",
                        Value = shippingHeights,
                        Selector = HeightSelectorConst,
                        LabelSelector = BoxZLabelConst,
                    },
                    new
                    {
                        Name = "Shipping Max (Lot Size)",
                        Value = shippingMaxs,
                        Selector = MaxDimensionSelectorConst,
                        LabelSelector = LotSizeLabelConst,
                    },
                };

                foreach (var field in dimensionFields)
                {
                    if (!string.IsNullOrEmpty(field.Value))
                    {
                        await signalRLogger($"[Task {taskId}] {field.Name} found: {field.Value}");
                        var fieldLocator = page.Locator(field.Selector);
                        if (await fieldLocator.IsVisibleAsync())
                        {
                            var currentFieldValue = (
                                await fieldLocator.InputValueAsync() ?? ""
                            ).Trim();
                            if (currentFieldValue != field.Value)
                            {
                                await signalRLogger(
                                    $"[Task {taskId}] Processing {field.Name}. Current: '{currentFieldValue}', Desired: '{field.Value}'"
                                );

                                if (
                                    !string.IsNullOrEmpty(field.LabelSelector)
                                    && await page.Locator(field.LabelSelector).IsVisibleAsync()
                                )
                                {
                                    await page.Locator(field.LabelSelector).HoverAsync();

                                    await page.Locator(field.LabelSelector).FocusAsync();
                                    await page.Keyboard.PressAsync("Tab");
                                }
                                else
                                {
                                    await fieldLocator.ClickAsync();
                                }
                                await Task.Delay(100);

                                await ClearInputAndTypeAsync(
                                    taskId,
                                    page,
                                    field.Selector,
                                    field.Value,
                                    signalRLogger,
                                    field.Name
                                );

                                string filledValue = (
                                    await fieldLocator.InputValueAsync() ?? ""
                                ).Trim();
                                if (filledValue == field.Value)
                                {
                                    await signalRLogger(
                                        $"[Task {taskId}] Completed filling {field.Name} with: {field.Value}"
                                    );
                                }
                                else
                                {
                                    await signalRLogger(
                                        $"[Task {taskId}] [Error] Failed to fill {field.Name}. Expected: {field.Value}, Got: {filledValue}"
                                    );
                                }
                            }
                            else
                            {
                                await signalRLogger(
                                    $"[Task {taskId}] {field.Name} is already set to: {field.Value}"
                                );
                            }
                        }
                        else
                        {
                            await signalRLogger(
                                $"[Task {taskId}] [Error] {field.Name} selector '{field.Selector}' not visible, skipping."
                            );
                        }
                    }
                    else
                    {
                        await signalRLogger(
                            $"[Task {taskId}] {field.Name} not provided, skipping."
                        );
                    }
                }
            }
            else
            {
                await signalRLogger(
                    $"[Task {taskId}] No weight or shipping dimensions provided, skipping this section."
                );
            }

            await signalRLogger($"[Task {taskId}] SettingsTabAsync processing finished.");
        }
    }
}
