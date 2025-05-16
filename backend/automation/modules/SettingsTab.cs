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
                    Console.WriteLine(
                        $"[Task {taskId}] Filled {fieldNameForLogging} with: {valueToType}"
                    );
                    await signalRLogger(
                        $"[Task {taskId}] Filled {fieldNameForLogging} with: {valueToType}"
                    );
                }
                else
                {
                    Console.WriteLine(
                        $"[Task {taskId}] {fieldNameForLogging} is to be empty, field cleared."
                    );
                    await signalRLogger(
                        $"[Task {taskId}] {fieldNameForLogging} is to be empty, field cleared."
                    );
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"[Task {taskId}] [Error] Failed to fill {fieldNameForLogging} ('{selector}') with '{valueToType}'. Error: {ex.Message}"
                );
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
                "#ctl00_ctl00_C_M_ctl00_W\\$ctl01_OrderQuantitiesCtrl__Advanced",
            string inputElement =
                @"input[name=""ctl00$ctl00$C$M$ctl00$W$ctl01$OrderQuantitiesCtrl$_Expression""]",
            string maxQtySelector =
                @"input[name=""ctl00$ctl00$C$M$ctl00$W$ctl01$OrderQuantitiesCtrl$txtMaxOrderQuantityPermitted""]",
            string showQtyPriceSelector = @"input[value=""rdbShowPricing""]"
        )
        {
            if (productType == "Product Matrix" || productType == "Non Printed Products")
            {
                Console.WriteLine(
                    $"[Task {taskId}] Product Type is '{productType}', skipping Settings Tab."
                );
                await signalRLogger(
                    $"[Task {taskId}] Product Type is '{productType}', skipping Settings Tab."
                );
                return;
            }

            if (!string.IsNullOrEmpty(orderQuantities))
            {
                Console.WriteLine($"[Task {taskId}] Order Quantities: {orderQuantities}");
                await signalRLogger($"[Task {taskId}] Order Quantities: {orderQuantities}");
                switch (orderQuantities)
                {
                    case "AnyQuantity":
                        await page.Locator(anyQuantitiesButton).ClickAsync();
                        Console.WriteLine(
                            $"[Task {taskId}] Clicked Any Quantity for selected quantity: {orderQuantities}"
                        );
                        await signalRLogger(
                            $"[Task {taskId}] Clicked Any Quantity for selected quantity: {orderQuantities}"
                        );
                        break;
                    case "SpecificQuantity":
                        await page.Locator(advancedQuantitiesButton).ClickAsync();
                        Console.WriteLine(
                            $"[Task {taskId}] Clicked Advanced Quantities for selected quantity: {orderQuantities}"
                        );
                        await signalRLogger(
                            $"[Task {taskId}] Clicked Advanced Quantities for selected quantity: {orderQuantities}"
                        );
                        var advancedRangesInputElement = page.Locator(inputElement);
                        if (await advancedRangesInputElement.IsVisibleAsync())
                        {
                            Console.WriteLine(
                                $"[Task {taskId}] Found input element for Advanced Ranges"
                            );
                            await signalRLogger(
                                $"[Task {taskId}] Found input element for Advanced Ranges"
                            );
                            await advancedRangesInputElement.FillAsync(advancedRanges ?? "");
                            await page.Locator(
                                    "#ctl00_ctl00_C_M_ctl00_W\\$ctl01_OrderQuantitiesCtrl_btnDone"
                                )
                                .ClickAsync();
                            Console.WriteLine(
                                $"[Task {taskId}] Filled Advanced Ranges with: {advancedRanges}"
                            );
                            await signalRLogger(
                                $"[Task {taskId}] Filled Advanced Ranges with: {advancedRanges}"
                            );
                        }
                        else
                        {
                            Console.WriteLine(
                                $"[Task {taskId}] [Error] Input Element for Advanced Ranges not found"
                            );
                            await signalRLogger(
                                $"[Task {taskId}] [Error] Input Element for Advanced Ranges not found"
                            );
                        }
                        break;
                    default:
                        Console.WriteLine(
                            $"[Task {taskId}] Order Quantities: '{orderQuantities}' - Default case, assuming skip or specific action. Clicked Advanced Button."
                        );
                        await signalRLogger(
                            $"[Task {taskId}] Order Quantities: '{orderQuantities}' - Default case, Clicked Advanced Button. Assuming skip or specific action."
                        );
                        await page.Locator(advancedQuantitiesButton).ClickAsync();
                        break;
                }
            }
            else
            {
                Console.WriteLine(
                    $"[Task {taskId}] Order Quantities not found or not provided, skipping"
                );
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
                    Console.WriteLine(
                        $"[Task {taskId}] Max Quantity field current value: '{actualFieldValue}'"
                    );
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
                        Console.WriteLine(
                            $"[Task {taskId}] Max Quantity is already set to: "
                                + (
                                    string.IsNullOrEmpty(currentMaxQuantityValueToSet)
                                        ? "empty"
                                        : currentMaxQuantityValueToSet
                                )
                        );
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
                        Console.WriteLine(
                            $"[Task {taskId}] Max Quantity: Current '{actualFieldValue}', Desired '{currentMaxQuantityValueToSet}'. Updating."
                        );
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
                    Console.WriteLine(
                        $"[Task {taskId}] [Error] Max Quantity selector ('{maxQtySelector}') not found, skipping"
                    );
                    await signalRLogger(
                        $"[Task {taskId}] [Error] Max Quantity selector ('{maxQtySelector}') not found, skipping"
                    );
                }
            }
            else
            {
                Console.WriteLine($"[Task {taskId}] Max Quantity input not provided, skipping");
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
                        Console.WriteLine(
                            $"[Task {taskId}] Show Quantity Price current state: {isCurrentlyChecked}, Desired state: {desiredState}"
                        );
                        await signalRLogger(
                            $"[Task {taskId}] Show Quantity Price current state: {isCurrentlyChecked}, Desired state: {desiredState}"
                        );

                        if (isCurrentlyChecked != desiredState)
                        {
                            Console.WriteLine(
                                $"[Task {taskId}] Clicking Show Quantity Price checkbox."
                            );
                            await signalRLogger(
                                $"[Task {taskId}] Clicking Show Quantity Price checkbox."
                            );
                            await showQtyPriceLocator.ClickAsync();
                        }
                        else
                        {
                            Console.WriteLine(
                                $"[Task {taskId}] Show Quantity Price already set to desired state."
                            );
                            await signalRLogger(
                                $"[Task {taskId}] Show Quantity Price already set to desired state."
                            );
                        }
                    }
                    else
                    {
                        Console.WriteLine(
                            $"[Task {taskId}] [Error] Show Quantity Price selector ('{showQtyPriceSelector}') not found, skipping."
                        );
                        await signalRLogger(
                            $"[Task {taskId}] [Error] Show Quantity Price selector ('{showQtyPriceSelector}') not found, skipping."
                        );
                    }
                }
                else
                {
                    Console.WriteLine(
                        $"[Task {taskId}] [Error] Invalid value for showQtyPrice: {showQtyPrice}. Expected 'true' or 'false'. Skipping."
                    );
                    await signalRLogger(
                        $"[Task {taskId}] [Error] Invalid value for showQtyPrice: {showQtyPrice}. Skipping."
                    );
                }
            }

            await page.EvaluateAsync("() => document.activeElement?.blur()");
            await page.Mouse.ClickAsync(0, 0);

            Console.WriteLine($"[Task {taskId}] Scrolling page...");
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
            Console.WriteLine($"[Task {taskId}] Scrolling complete.");
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
                var printWeightMeasurementLocator = page.Locator(PrintWeightMeasurementConst);
                if (await printWeightMeasurementLocator.IsVisibleAsync() && productType != "Ad Hoc")
                {
                    Console.WriteLine($"[Task {taskId}] Print weight measurement selector found");
                    await signalRLogger($"[Task {taskId}] Print weight measurement selector found");
                    var currentMeasurementValue =
                        await printWeightMeasurementLocator.InputValueAsync();
                    if (currentMeasurementValue == "0")
                    {
                        Console.WriteLine(
                            $"[Task {taskId}] Print weight measurement is oz, changing to lb."
                        );
                        await signalRLogger(
                            $"[Task {taskId}] Print weight measurement is oz, changing to lb."
                        );
                        await printWeightMeasurementLocator.SelectOptionAsync(
                            new SelectOptionValue { Value = "1" }
                        );
                    }
                    else
                    {
                        Console.WriteLine(
                            $"[Task {taskId}] Print weight measurement already set to lb (or not '0'). Current value: {currentMeasurementValue}"
                        );
                        await signalRLogger(
                            $"[Task {taskId}] Print weight measurement already set to lb (or not '0'). Current value: {currentMeasurementValue}"
                        );
                    }
                }
                else if (productType == "Ad Hoc")
                {
                    Console.WriteLine(
                        $"[Task {taskId}] Print weight measurement selector does not exist on Ad Hoc, skipping related weight input logic."
                    );
                    await signalRLogger(
                        $"[Task {taskId}] Print weight measurement selector does not exist on Ad Hoc, skipping related weight input logic."
                    );
                }
                else
                {
                    Console.WriteLine(
                        $"[Task {taskId}] [Error] Print weight measurement selector ('{PrintWeightMeasurementConst}') not found, critical for weight input. Potential error."
                    );
                    await signalRLogger(
                        $"[Task {taskId}] [Error] Print weight measurement selector ('{PrintWeightMeasurementConst}') not found, critical for weight input. Potential error."
                    );
                }

                if (!string.IsNullOrEmpty(weightInput) && productType != "Ad Hoc")
                {
                    Console.WriteLine($"[Task {taskId}] Weight input provided: {weightInput}");
                    await signalRLogger($"[Task {taskId}] Weight input provided: {weightInput}");
                    var printWeightCheckboxLocator = page.Locator(PrintWeightCheckboxConst);
                    var printWeightInputLocator = page.Locator(PrintWeightInputConst);

                    if (
                        await printWeightCheckboxLocator.IsVisibleAsync()
                        && await printWeightInputLocator.IsVisibleAsync()
                    )
                    {
                        bool isCheckboxChecked = await printWeightCheckboxLocator.IsCheckedAsync();
                        string currentInputValue = (
                            await printWeightInputLocator.InputValueAsync() ?? ""
                        ).Trim();

                        if (!isCheckboxChecked && currentInputValue == "0")
                        {
                            Console.WriteLine(
                                $"[Task {taskId}] Print weight checkbox not checked and input is 0. Clicking checkbox and setting weight to '{effectiveWeightInput}'."
                            );
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
                                await ClearInputAndTypeAsync(
                                    taskId,
                                    page,
                                    PrintWeightInputConst,
                                    effectiveWeightInput,
                                    signalRLogger,
                                    "Print Weight"
                                );
                            }
                        }
                        else if (isCheckboxChecked && currentInputValue == effectiveWeightInput)
                        {
                            Console.WriteLine(
                                $"[Task {taskId}] Print weight checkbox already checked and weight is correctly set to '{effectiveWeightInput}'. Skipping."
                            );
                            await signalRLogger(
                                $"[Task {taskId}] Print weight checkbox already checked and weight is correctly set to '{effectiveWeightInput}'. Skipping."
                            );
                        }
                        else if (isCheckboxChecked && currentInputValue != effectiveWeightInput)
                        {
                            Console.WriteLine(
                                $"[Task {taskId}] Print weight checkbox checked, but input value '{currentInputValue}' differs from desired '{effectiveWeightInput}'. Updating weight."
                            );
                            await signalRLogger(
                                $"[Task {taskId}] Print weight checkbox checked, but input value '{currentInputValue}' differs from desired '{effectiveWeightInput}'. Updating weight."
                            );
                            await ClearInputAndTypeAsync(
                                taskId,
                                page,
                                PrintWeightInputConst,
                                effectiveWeightInput,
                                signalRLogger,
                                "Print Weight"
                            );
                        }
                        else if (!isCheckboxChecked && currentInputValue != "0")
                        {
                            Console.WriteLine(
                                $"[Task {taskId}] Print weight checkbox not checked, but input value is '{currentInputValue}'. Clicking checkbox and ensuring weight is '{effectiveWeightInput}'."
                            );
                            await signalRLogger(
                                $"[Task {taskId}] Print weight checkbox not checked, but input value is '{currentInputValue}'. Clicking checkbox and ensuring weight is '{effectiveWeightInput}'."
                            );
                            await printWeightCheckboxLocator.ClickAsync();

                            await ClearInputAndTypeAsync(
                                taskId,
                                page,
                                PrintWeightInputConst,
                                effectiveWeightInput,
                                signalRLogger,
                                "Print Weight"
                            );
                        }
                        else
                        {
                            Console.WriteLine(
                                $"[Task {taskId}] Print weight state: Checkbox={isCheckboxChecked}, Input='{currentInputValue}'. Desired weight='{effectiveWeightInput}'. Defaulting to ensure correct state."
                            );
                            await signalRLogger(
                                $"[Task {taskId}] Print weight state: Checkbox={isCheckboxChecked}, Input='{currentInputValue}'. Desired weight='{effectiveWeightInput}'. Defaulting to ensure correct state."
                            );
                            if (!isCheckboxChecked)
                                await printWeightCheckboxLocator.ClickAsync();
                            await ClearInputAndTypeAsync(
                                taskId,
                                page,
                                PrintWeightInputConst,
                                effectiveWeightInput,
                                signalRLogger,
                                "Print Weight"
                            );
                        }
                    }
                    else
                    {
                        Console.WriteLine(
                            $"[Task {taskId}] [Error] Print weight checkbox ('{PrintWeightCheckboxConst}') or input ('{PrintWeightInputConst}') not found, skipping weight input."
                        );
                        await signalRLogger(
                            $"[Task {taskId}] [Error] Print weight checkbox or input not found, skipping weight input."
                        );
                    }
                }
                else if (productType == "Ad Hoc")
                {
                    Console.WriteLine(
                        $"[Task {taskId}] WeightInput skipped for Ad Hoc product type."
                    );
                    await signalRLogger(
                        $"[Task {taskId}] WeightInput skipped for Ad Hoc product type."
                    );
                }
                else
                {
                    Console.WriteLine(
                        $"[Task {taskId}] WeightInput not provided, skipping print weight input field."
                    );
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
                        Console.WriteLine($"[Task {taskId}] {field.Name} found: {field.Value}");
                        await signalRLogger($"[Task {taskId}] {field.Name} found: {field.Value}");
                        var fieldLocator = page.Locator(field.Selector);
                        if (await fieldLocator.IsVisibleAsync())
                        {
                            var currentFieldValue = (
                                await fieldLocator.InputValueAsync() ?? ""
                            ).Trim();
                            if (currentFieldValue != field.Value)
                            {
                                Console.WriteLine(
                                    $"[Task {taskId}] Processing {field.Name}. Current: '{currentFieldValue}', Desired: '{field.Value}'"
                                );
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
                                    Console.WriteLine(
                                        $"[Task {taskId}] Completed filling {field.Name} with: {field.Value}"
                                    );
                                    await signalRLogger(
                                        $"[Task {taskId}] Completed filling {field.Name} with: {field.Value}"
                                    );
                                }
                                else
                                {
                                    Console.WriteLine(
                                        $"[Task {taskId}] [Error] Failed to fill {field.Name}. Expected: {field.Value}, Got: {filledValue}"
                                    );
                                    await signalRLogger(
                                        $"[Task {taskId}] [Error] Failed to fill {field.Name}. Expected: {field.Value}, Got: {filledValue}"
                                    );
                                }
                            }
                            else
                            {
                                Console.WriteLine(
                                    $"[Task {taskId}] {field.Name} is already set to: {field.Value}"
                                );
                                await signalRLogger(
                                    $"[Task {taskId}] {field.Name} is already set to: {field.Value}"
                                );
                            }
                        }
                        else
                        {
                            Console.WriteLine(
                                $"[Task {taskId}] [Error] {field.Name} selector '{field.Selector}' not visible, skipping."
                            );
                            await signalRLogger(
                                $"[Task {taskId}] [Error] {field.Name} selector '{field.Selector}' not visible, skipping."
                            );
                        }
                    }
                    else
                    {
                        Console.WriteLine($"[Task {taskId}] {field.Name} not provided, skipping.");
                        await signalRLogger(
                            $"[Task {taskId}] {field.Name} not provided, skipping."
                        );
                    }
                }
            }
            else
            {
                Console.WriteLine(
                    $"[Task {taskId}] No weight or shipping dimensions provided, skipping this section."
                );
                await signalRLogger(
                    $"[Task {taskId}] No weight or shipping dimensions provided, skipping this section."
                );
            }

            Console.WriteLine($"[Task {taskId}] SettingsTabAsync processing finished.");
            await signalRLogger($"[Task {taskId}] SettingsTabAsync processing finished.");
        }
    }
}
