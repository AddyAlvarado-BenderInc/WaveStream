using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Playwright;
using Microsoft.VisualBasic;

namespace backend.automation.modules
{
    public class TicketTemplateContainer
    {
        private const string ticketSelector =
            "select[name=\"ctl00$ctl00$C$M$ctl00$W$ctl03$TicketTemplates\"]";

        private static readonly Dictionary<string, string> ticketSelectorOptions = new Dictionary<
            string,
            string
        >
        {
            { "default", "100289" },
            { "4/4", "100290" },
            { "4/0_No_Special_Instructions", "100520" },
            { "4/4_No_Special_Instructions", "100521" },
        };

        public async Task TicketTemplateSelectorAsync(
            int taskId,
            IPage page,
            string templates,
            string productType,
            Func<string, Task> signalRLogger
        )
        {
            try
            {
                if (productType is "Non Printed Products" or "Product Matrix" or "Fusion Products")
                {
                    await signalRLogger(
                        $"[Task {taskId}] No ticket template needed due to {productType} product type."
                    );
                    return;
                }
                if (string.IsNullOrEmpty(templates))
                {
                    await signalRLogger($"[Task {taskId}] No template selected.");
                    return;
                }

                if (ticketSelectorOptions.TryGetValue(templates, out string? templateValue))
                {
                    await page.Locator(ticketSelector)
                        .SelectOptionAsync(new SelectOptionValue { Label = templateValue });
                    await signalRLogger(
                        $"[Task {taskId}] Ticket template selected: {templates} (Value/Label: {templateValue})"
                    );
                }
                else
                {
                    await signalRLogger(
                        $"[Task {taskId}] [Error] Ticket template key '{templates}' not found in options. Available keys: {string.Join(", ", ticketSelectorOptions.Keys)}"
                    );

                    return;
                }
            }
            catch (KeyNotFoundException knfEx)
            {
                await signalRLogger(
                    $"[Task {taskId}] [Error] Ticket template key '{templates}' not found in predefined options: {knfEx.Message}. Available keys: {string.Join(", ", ticketSelectorOptions.Keys)}"
                );
                return;
            }
            catch (Exception ex)
            {
                await signalRLogger(
                    $"[Task {taskId}] [Error] Error during ticket template selection: {ex.Message}"
                );

                return;
            }
        }
    }
}
