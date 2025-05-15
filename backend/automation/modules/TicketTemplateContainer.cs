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
                    Console.WriteLine(
                        $"No ticket template needed due to {productType} product type."
                    );
                    await signalRLogger(
                        $"[Task {taskId}] No ticket template needed due to {productType} product type."
                    );
                    return;
                }
                if (string.IsNullOrEmpty(templates))
                {
                    Console.WriteLine("No template selected.");
                    await signalRLogger($"[Task {taskId}] No template selected.");
                    return;
                }
                await page.Locator(ticketSelector)
                    .SelectOptionAsync(
                        new SelectOptionValue { Label = ticketSelectorOptions[templates] }
                    );
                Console.WriteLine($"Ticket template selected: {ticketSelectorOptions[templates]}");
                await signalRLogger(
                    $"[Task {taskId}] Ticket template selected: {ticketSelectorOptions[templates]}"
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error waiting for ticket selector: {ex.Message}");
                await signalRLogger(
                    $"[Task {taskId}] Error waiting for ticket selector: {ex.Message}"
                );
                return;
            }
        }
    }
}
