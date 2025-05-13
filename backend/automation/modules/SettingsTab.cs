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
            IPage page,
            string selector,
            string valueToType,
            Func<string, Task> signalRLogger,
            string fieldNameForLogging
        )
        {
            var locator = page.Locator(selector);

            await locator.FillAsync(valueToType ?? "");

            if (!string.IsNullOrEmpty(valueToType))
            {
                Console.WriteLine($"Filled {fieldNameForLogging} with: {valueToType}");
                await signalRLogger($"Filled {fieldNameForLogging} with: {valueToType}");
            }
            else
            {
                Console.WriteLine($"{fieldNameForLogging} is to be empty, field cleared.");
                await signalRLogger($"{fieldNameForLogging} is to be empty, field cleared.");
            }
        }

        public async Task SettingsTabAsync(
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
                    "Product Type is Product Matrix or Non Printed Products, skipping Settings Tab."
                );
                await signalRLogger(
                    "Product Type is Product Matrix or Non Printed Products, skipping Settings Tab."
                );
                return;
            }

            if (!string.IsNullOrEmpty(orderQuantities))
            {
                Console.WriteLine("Order Quantities: " + orderQuantities);
                await signalRLogger("Order Quantities: " + orderQuantities);
                switch (orderQuantities)
                {
                    case "AnyQuantity":
                        await page.Locator(anyQuantitiesButton).ClickAsync();
                        Console.WriteLine(
                            "Clicked Any Quantity for selected quantity: " + orderQuantities
                        );
                        await signalRLogger(
                            "Clicked Any Quantity for selected quantity: " + orderQuantities
                        );
                        break;
                    case "SpecificQuantity":
                        await page.Locator(advancedQuantitiesButton).ClickAsync();
                        Console.WriteLine(
                            "Clicked Advanced Quantities for selected quantity: " + orderQuantities
                        );
                        await signalRLogger(
                            "Clicked Advanced Quantities for selected quantity: " + orderQuantities
                        );
                        var advancedRangesInputElement = page.Locator(inputElement);
                        if (await advancedRangesInputElement.IsVisibleAsync())
                        {
                            Console.WriteLine("Found input element for Advanced Ranges");
                            await signalRLogger("Found input element for Advanced Ranges");
                            await advancedRangesInputElement.FillAsync(advancedRanges ?? "");
                            await page.Locator(
                                    "#ctl00_ctl00_C_M_ctl00_W\\$ctl01_OrderQuantitiesCtrl_btnDone"
                                )
                                .ClickAsync();
                            Console.WriteLine("Filled Advanced Ranges with: " + advancedRanges);
                            await signalRLogger("Filled Advanced Ranges with: " + advancedRanges);
                        }
                        else
                        {
                            Console.WriteLine("Input Element for Advanced Ranges not found");
                            await signalRLogger("Input Element for Advanced Ranges not found");
                        }
                        break;
                    default:
                        await page.Locator(advancedQuantitiesButton).ClickAsync();
                        Console.WriteLine(
                            "Order Quantities: Default case, assuming skip or specific action. Clicked Advanced Button."
                        );
                        await signalRLogger(
                            "Order Quantities: Default case, Clicked Advanced Button. Assuming skip or specific action."
                        );
                        break;
                }
            }
            else
            {
                Console.WriteLine("Order Quantities not found or not provided, skipping");
                await signalRLogger("Order Quantities not found or not provided, skipping");
            }

            if (!string.IsNullOrEmpty(maxQuantityInput))
            {
                string currentMaxQuantityValueToSet = maxQuantityInput;
                var maxQtyLocator = page.Locator(maxQtySelector);

                if (await maxQtyLocator.IsVisibleAsync())
                {
                    var actualFieldValue = (await maxQtyLocator.InputValueAsync() ?? "").Trim();
                    Console.WriteLine($"Max Quantity field current value: '{actualFieldValue}'");
                    await signalRLogger($"Max Quantity field current value: '{actualFieldValue}'");

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
                            "Max Quantity is already set to: "
                                + (
                                    string.IsNullOrEmpty(currentMaxQuantityValueToSet)
                                        ? "empty"
                                        : currentMaxQuantityValueToSet
                                )
                        );
                        await signalRLogger(
                            "Max Quantity is already set to: "
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
                            $"Max Quantity: Current '{actualFieldValue}', Desired '{currentMaxQuantityValueToSet}'. Updating."
                        );
                        await signalRLogger(
                            $"Max Quantity: Current '{actualFieldValue}', Desired '{currentMaxQuantityValueToSet}'. Updating."
                        );
                        await ClearInputAndTypeAsync(
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
                    Console.WriteLine("Max Quantity selector not found, skipping");
                    await signalRLogger("Max Quantity selector not found, skipping");
                }
            }
            else
            {
                Console.WriteLine("Max Quantity input not provided, skipping");
                await signalRLogger("Max Quantity input not provided, skipping");
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
                            $"Show Quantity Price current state: {isCurrentlyChecked}, Desired state: {desiredState}"
                        );
                        await signalRLogger(
                            $"Show Quantity Price current state: {isCurrentlyChecked}, Desired state: {desiredState}"
                        );

                        if (isCurrentlyChecked != desiredState)
                        {
                            Console.WriteLine("Clicking Show Quantity Price checkbox.");
                            await signalRLogger("Clicking Show Quantity Price checkbox.");
                            await showQtyPriceLocator.ClickAsync();
                        }
                        else
                        {
                            Console.WriteLine("Show Quantity Price already set to desired state.");
                            await signalRLogger(
                                "Show Quantity Price already set to desired state."
                            );
                        }
                    }
                    else
                    {
                        Console.WriteLine("Show Quantity Price selector not found, skipping.");
                        await signalRLogger("Show Quantity Price selector not found, skipping.");
                    }
                }
                else
                {
                    Console.WriteLine(
                        $"Invalid value for showQtyPrice: {showQtyPrice}. Expected 'true' or 'false'. Skipping."
                    );
                    await signalRLogger(
                        $"Invalid value for showQtyPrice: {showQtyPrice}. Skipping."
                    );
                }
            }

            await page.EvaluateAsync("() => document.activeElement?.blur()");
            await page.Mouse.ClickAsync(0, 0);

            Console.WriteLine("Scrolling page...");
            await signalRLogger("Scrolling page...");
            if (productType != "Non Printed Products")
            {
                await page.EvaluateAsync("() => window.scrollBy(0, window.innerHeight * 0.5)");

                await page.EvaluateAsync("() => window.scrollBy(0, window.innerHeight * 0.5)");
            }
            else
            {
                await page.EvaluateAsync("() => window.scrollTo(0, document.body.scrollHeight)");
            }
            Console.WriteLine("Scrolling complete.");
            await signalRLogger("Scrolling complete.");

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
                    Console.WriteLine("Print weight measurement selector found");
                    await signalRLogger("Print weight measurement selector found");
                    var currentMeasurementValue =
                        await printWeightMeasurementLocator.InputValueAsync();
                    if (currentMeasurementValue == "0")
                    {
                        Console.WriteLine("Print weight measurement is oz, changing to lb.");
                        await signalRLogger("Print weight measurement is oz, changing to lb.");
                        await printWeightMeasurementLocator.SelectOptionAsync(
                            new SelectOptionValue { Value = "1" }
                        );
                    }
                    else
                    {
                        Console.WriteLine(
                            "Print weight measurement already set to lb (or not '0')."
                        );
                        await signalRLogger(
                            "Print weight measurement already set to lb (or not '0')."
                        );
                    }
                }
                else if (productType == "Ad Hoc")
                {
                    Console.WriteLine(
                        "Print weight measurement selector does not exist on Ad Hoc, skipping weight input."
                    );
                    await signalRLogger(
                        "Print weight measurement selector not found Ad Hoc, skipping weight input."
                    );
                }
                else
                {
                    Console.WriteLine(
                        "Print weight measurement selector not found, critical for weight input. Potential error."
                    );
                    await signalRLogger(
                        "Print weight measurement selector not found, critical for weight input. Potential error."
                    );
                }

                if (!string.IsNullOrEmpty(weightInput))
                {
                    Console.WriteLine($"Weight input provided: {weightInput}");
                    await signalRLogger($"Weight input provided: {weightInput}");
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
                                "Print weight checkbox not checked and input is 0. Clicking checkbox and setting weight."
                            );
                            await signalRLogger(
                                "Print weight checkbox not checked and input is 0. Clicking checkbox and setting weight."
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
                                "Print weight checkbox already checked and weight is correctly set. Skipping."
                            );
                            await signalRLogger(
                                "Print weight checkbox already checked and weight is correctly set. Skipping."
                            );
                        }
                        else if (isCheckboxChecked && currentInputValue != effectiveWeightInput)
                        {
                            Console.WriteLine(
                                $"Print weight checkbox checked, but input value '{currentInputValue}' differs from desired '{effectiveWeightInput}'. Updating weight."
                            );
                            await signalRLogger(
                                $"Print weight checkbox checked, but input value '{currentInputValue}' differs from desired '{effectiveWeightInput}'. Updating weight."
                            );
                            await ClearInputAndTypeAsync(
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
                                $"Print weight checkbox not checked, but input value is '{currentInputValue}'. Clicking checkbox and ensuring weight."
                            );
                            await signalRLogger(
                                $"Print weight checkbox not checked, but input value is '{currentInputValue}'. Clicking checkbox and ensuring weight."
                            );
                            await printWeightCheckboxLocator.ClickAsync();

                            await ClearInputAndTypeAsync(
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
                                $"Print weight state: Checkbox={isCheckboxChecked}, Input='{currentInputValue}'. Desired weight='{effectiveWeightInput}'. No specific action taken based on JS logic's main paths."
                            );
                            await signalRLogger(
                                $"Print weight state: Checkbox={isCheckboxChecked}, Input='{currentInputValue}'. Desired weight='{effectiveWeightInput}'. No specific action."
                            );
                        }
                    }
                    else
                    {
                        Console.WriteLine(
                            "Print weight checkbox or input not found, skipping weight input."
                        );
                        await signalRLogger(
                            "Print weight checkbox or input not found, skipping weight input."
                        );
                    }
                }
                else
                {
                    Console.WriteLine(
                        "WeightInput not provided, skipping print weight input field."
                    );
                    await signalRLogger(
                        "WeightInput not provided, skipping print weight input field."
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
                        Console.WriteLine($"{field.Name} found: {field.Value}");
                        await signalRLogger($"{field.Name} found: {field.Value}");
                        var fieldLocator = page.Locator(field.Selector);
                        if (await fieldLocator.IsVisibleAsync())
                        {
                            var currentFieldValue = (
                                await fieldLocator.InputValueAsync() ?? ""
                            ).Trim();
                            if (currentFieldValue != field.Value)
                            {
                                Console.WriteLine(
                                    $"Processing {field.Name}. Current: '{currentFieldValue}', Desired: '{field.Value}'"
                                );
                                await signalRLogger(
                                    $"Processing {field.Name}. Current: '{currentFieldValue}', Desired: '{field.Value}'"
                                );

                                if (
                                    !string.IsNullOrEmpty(field.LabelSelector)
                                    && await page.Locator(field.LabelSelector).IsVisibleAsync()
                                )
                                {
                                    await page.Locator(field.LabelSelector).HoverAsync();

                                    await page.Keyboard.PressAsync("Tab");
                                }
                                else
                                {
                                    await fieldLocator.ClickAsync();
                                }

                                await ClearInputAndTypeAsync(
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
                                        $"Completed filling {field.Name} with: {field.Value}"
                                    );
                                    await signalRLogger(
                                        $"Completed filling {field.Name} with: {field.Value}"
                                    );
                                }
                                else
                                {
                                    Console.WriteLine(
                                        $"Failed to fill {field.Name}. Expected: {field.Value}, Got: {filledValue}"
                                    );
                                    await signalRLogger(
                                        $"Failed to fill {field.Name}. Expected: {field.Value}, Got: {filledValue}"
                                    );
                                }
                            }
                            else
                            {
                                Console.WriteLine($"{field.Name} is already set to: {field.Value}");
                                await signalRLogger(
                                    $"{field.Name} is already set to: {field.Value}"
                                );
                            }
                        }
                        else
                        {
                            Console.WriteLine(
                                $"{field.Name} selector '{field.Selector}' not visible, skipping."
                            );
                            await signalRLogger(
                                $"{field.Name} selector '{field.Selector}' not visible, skipping."
                            );
                        }
                    }
                    else
                    {
                        Console.WriteLine($"{field.Name} not provided, skipping.");
                        await signalRLogger($"{field.Name} not provided, skipping.");
                    }
                }
            }
            else
            {
                Console.WriteLine(
                    "No weight or shipping dimensions provided, skipping this section."
                );
                await signalRLogger(
                    "No weight or shipping dimensions provided, skipping this section."
                );
            }

            Console.WriteLine("SettingsTabAsync processing finished.");
            await signalRLogger("SettingsTabAsync processing finished.");
        }
    }
}
