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
                "#ctl00_ctl00_C_M_ctl00_W\\$ctl01_OrderQuantitiesCtrl__Advanced",
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
                switch (orderQuantities)
                {
                    case "AnyQuantity":
                        await page.Locator(anyQuantitiesButton).ClickAsync();
                        await signalRLogger(
                            $"[Task {taskId}] Clicked Any Quantity for selected quantity: {orderQuantities}"
                        );
                        break;
                    case "SpecificQuantity":
                        await page.Locator(advancedQuantitiesButton).ClickAsync();
                        await signalRLogger(
                            $"[Task {taskId}] Clicked Advanced Quantities for selected quantity: {orderQuantities}"
                        );
                        var advancedRangesInputElement = page.Locator(inputElement);
                        if (await advancedRangesInputElement.IsVisibleAsync())
                        {
                            await signalRLogger(
                                $"[Task {taskId}] Found input element for Advanced Ranges"
                            );
                            await advancedRangesInputElement.FillAsync(advancedRanges ?? "");
                            await page.Locator(
                                    "#ctl00_ctl00_C_M_ctl00_W\\$ctl01_OrderQuantitiesCtrl_btnDone"
                                )
                                .ClickAsync();
                            await signalRLogger(
                                $"[Task {taskId}] Filled Advanced Ranges with: {advancedRanges}"
                            );
                        }
                        else
                        {
                            await signalRLogger(
                                $"[Task {taskId}] [Error] Input Element for Advanced Ranges not found"
                            );
                        }
                        break;
                    default:
                        await signalRLogger(
                            $"[Task {taskId}] Order Quantities: '{orderQuantities}' - Default case, Clicked Advanced Button. Assuming skip or specific action."
                        );
                        await page.Locator(advancedQuantitiesButton).ClickAsync();
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
                var printWeightMeasurementLocator = page.Locator(PrintWeightMeasurementConst);
                if (await printWeightMeasurementLocator.IsVisibleAsync() && productType != "Ad Hoc")
                {
                    await signalRLogger($"[Task {taskId}] Print weight measurement selector found");
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
                        $"[Task {taskId}] [Error] Print weight measurement selector ('{PrintWeightMeasurementConst}') not found, critical for weight input. Potential error."
                    );
                }

                if (!string.IsNullOrEmpty(weightInput) && productType != "Ad Hoc")
                {
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
                            await signalRLogger(
                                $"[Task {taskId}] Print weight checkbox already checked and weight is correctly set to '{effectiveWeightInput}'. Skipping."
                            );
                        }
                        else if (isCheckboxChecked && currentInputValue != effectiveWeightInput)
                        {
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
