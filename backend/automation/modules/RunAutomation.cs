using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using backend.automation.modules;
using Microsoft.Playwright;

class runAuto
{
    private SemaphoreSlim? processingSemaphore;
    private SemaphoreSlim saveSemaphore = new SemaphoreSlim(1, 1);

    private ConcurrentQueue<Tuple<IPage, IBrowserContext, string, int>> pagesToSaveQueue =
        new ConcurrentQueue<Tuple<IPage, IBrowserContext, string, int>>();

    public async Task RunAutomation(
        dynamic products,
        IPage initialPage,
        IBrowser browser,
        string threadCount
    )
    {
        string productListUrl = initialPage.Url;
        var initialCookies = await initialPage.Context.CookiesAsync();
        int maxConcurrentProcessingTasks = threadCount != null ? int.Parse(threadCount) : 1;
        Console.WriteLine(
            $"Product list page URL: {productListUrl}. Retrieved {initialCookies.Count} cookies."
        );

        Console.WriteLine(
            $"Total products to process: {products.Count}. Max concurrent processing tasks: {maxConcurrentProcessingTasks}"
        );

        processingSemaphore = new SemaphoreSlim(maxConcurrentProcessingTasks);
        int processedCount = 0;
        int readyForSaveCount = 0;
        int savedCount = 0;

        List<dynamic> productList = new List<dynamic>(products);

        for (int i = 0; i < productList.Count; i += maxConcurrentProcessingTasks)
        {
            var batchProducts = productList.Skip(i).Take(maxConcurrentProcessingTasks).ToList();
            var batchProcessingTasks = new List<Task>();

            Console.WriteLine(
                $"Starting processing for batch {i / maxConcurrentProcessingTasks + 1}, {batchProducts.Count} products."
            );

            foreach (var product in batchProducts)
            {
                await processingSemaphore.WaitAsync();

                batchProcessingTasks.Add(
                    Task.Run(async () =>
                    {
                        IBrowserContext? taskContext = null;
                        IPage? productListPage = null;
                        IPage? detailPageToSave = null;
                        int currentTaskId =
                            Task.CurrentId ?? System.Threading.Thread.CurrentThread.ManagedThreadId;
                        string currentProductName =
                            product.ItemName?.ToString() ?? "Unknown Product";

                        try
                        {
                            Console.WriteLine(
                                $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Acquired PROCESSING semaphore for: {currentProductName}"
                            );
                            taskContext = await browser.NewContextAsync();
                            if (initialCookies.Any())
                                await taskContext.AddCookiesAsync(
                                    initialCookies.Select(c => new Cookie
                                    {
                                        Name = c.Name,
                                        Value = c.Value,
                                        Domain = c.Domain,
                                        Path = c.Path,
                                        Expires = c.Expires,
                                        HttpOnly = c.HttpOnly,
                                        Secure = c.Secure,
                                        SameSite = c.SameSite,
                                    })
                                );

                            productListPage = await taskContext.NewPageAsync();
                            Console.WriteLine(
                                $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Navigating to product list page for {currentProductName}"
                            );
                            await productListPage.GotoAsync(
                                productListUrl,
                                new PageGotoOptions
                                {
                                    WaitUntil = WaitUntilState.DOMContentLoaded,
                                    // If DOMContentLoaded is too fast and causes issues, try Load
                                    // WaitUntil = WaitUntilState.Load,
                                    Timeout = 30000,
                                }
                            );
                            Console.WriteLine(
                                $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Navigation complete for {currentProductName}"
                            );

                            Console.WriteLine(
                                $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Calling ProcessProductsAsync for {currentProductName}"
                            );
                            ProcessProducts processProducts = new ProcessProducts();
                            detailPageToSave = await processProducts.ProcessProductsAsync(
                                product,
                                productListPage,
                                currentTaskId
                            );

                            if (detailPageToSave != null)
                            {
                                pagesToSaveQueue.Enqueue(
                                    Tuple.Create(
                                        detailPageToSave,
                                        taskContext,
                                        currentProductName,
                                        currentTaskId
                                    )
                                );
                                Interlocked.Increment(ref readyForSaveCount);
                                Console.WriteLine(
                                    $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Product {currentProductName} is ready and queued for saving."
                                );
                            }
                            else
                            {
                                Console.WriteLine(
                                    $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Product {currentProductName} was skipped or failed processing before save."
                                );
                                Interlocked.Increment(ref processedCount);
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine(
                                $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Error in processing task for {currentProductName}: {ex.ToString()}"
                            );
                            Interlocked.Increment(ref processedCount);
                        }
                        finally
                        {
                            if (productListPage != null && !productListPage.IsClosed)
                            {
                                try
                                {
                                    await productListPage.CloseAsync();
                                }
                                catch (Exception ex)
                                {
                                    Console.WriteLine(
                                        $"[Task {currentTaskId}] Error closing productListPage: {ex.Message}"
                                    );
                                }
                            }

                            if (detailPageToSave == null && taskContext != null)
                            {
                                try
                                {
                                    await taskContext.CloseAsync();
                                }
                                catch (Exception ex)
                                {
                                    Console.WriteLine(
                                        $"[Task {currentTaskId}] Error closing taskContext: {ex.Message}"
                                    );
                                }
                            }
                            else if (detailPageToSave != null)
                            {
                                Console.WriteLine(
                                    $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] TaskContext for {currentProductName} will be closed after save by the save loop."
                                );
                            }

                            processingSemaphore.Release();
                            Console.WriteLine(
                                $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Released PROCESSING semaphore for: {currentProductName}"
                            );
                        }
                    })
                );
            }

            await Task.WhenAll(batchProcessingTasks);
            Console.WriteLine(
                $"Processing phase for batch {i / maxConcurrentProcessingTasks + 1} completed. {pagesToSaveQueue.Count} items currently in save queue."
            );

            while (pagesToSaveQueue.TryDequeue(out var saveCandidate))
            {
                IPage detailPage = saveCandidate.Item1;
                IBrowserContext contextToClose = saveCandidate.Item2;
                string productName = saveCandidate.Item3;
                int originalTaskId = saveCandidate.Item4;

                await saveSemaphore.WaitAsync();
                Console.WriteLine(
                    $"[SaveTask (from Task {originalTaskId}) - {DateTime.Now:HH:mm:ss.fff}] Acquired SAVE semaphore for: {productName}"
                );
                try
                {
                    if (detailPage != null && !detailPage.IsClosed)
                    {
                        Console.WriteLine(
                            $"[SaveTask (from Task {originalTaskId}) - {DateTime.Now:HH:mm:ss.fff}] Attempting to Save & Exit for product {productName}"
                        );
                        await detailPage
                            .Locator("input[value=\"Save & Exit\"]")
                            .ClickAsync(new LocatorClickOptions { Timeout = 20000 });

                        int closePollingTimeoutMs = 15000;
                        int pollIntervalMs = 500;
                        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
                        while (
                            stopwatch.ElapsedMilliseconds < closePollingTimeoutMs
                            && !detailPage.IsClosed
                        )
                        {
                            await Task.Delay(pollIntervalMs);
                        }
                        stopwatch.Stop();

                        if (detailPage.IsClosed)
                        {
                            Console.WriteLine(
                                $"[SaveTask (from Task {originalTaskId}) - {DateTime.Now:HH:mm:ss.fff}] Detail page for {productName} confirmed closed after Save & Exit."
                            );
                            Interlocked.Increment(ref savedCount);
                        }
                        else
                        {
                            Console.WriteLine(
                                $"[SaveTask (from Task {originalTaskId}) - {DateTime.Now:HH:mm:ss.fff}] Detail page for {productName} did NOT close. Forcibly closing."
                            );
                            await detailPage.CloseAsync();
                        }
                    }
                    else
                    {
                        Console.WriteLine(
                            $"[SaveTask (from Task {originalTaskId}) - {DateTime.Now:HH:mm:ss.fff}] Detail page for {productName} was null or already closed before save attempt."
                        );
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine(
                        $"[SaveTask (from Task {originalTaskId}) - {DateTime.Now:HH:mm:ss.fff}] Error during Save & Exit for {productName}: {ex.ToString()}"
                    );
                    if (detailPage != null && !detailPage.IsClosed)
                    {
                        try
                        {
                            await detailPage.CloseAsync();
                        }
                        catch (Exception closeEx)
                        {
                            Console.WriteLine(
                                $"[SaveTask (from Task {originalTaskId})] Error closing detail page after save error: {closeEx.Message}"
                            );
                        }
                    }
                }
                finally
                {
                    if (contextToClose != null)
                    {
                        try
                        {
                            Console.WriteLine(
                                $"[SaveTask (from Task {originalTaskId}) - {DateTime.Now:HH:mm:ss.fff}] Closing context for {productName}."
                            );
                            await contextToClose.CloseAsync();
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine(
                                $"[SaveTask (from Task {originalTaskId})] Error closing context for {productName}: {ex.Message}"
                            );
                        }
                    }

                    Interlocked.Increment(ref processedCount);
                    saveSemaphore.Release();
                    Console.WriteLine(
                        $"[SaveTask (from Task {originalTaskId}) - {DateTime.Now:HH:mm:ss.fff}] Released SAVE semaphore for: {productName}. Total processed so far: {processedCount}/{productList.Count}"
                    );
                }
            }
            Console.WriteLine(
                $"Save loop for batch {i / maxConcurrentProcessingTasks + 1} completed."
            );
        }

        await initialPage.CloseAsync();

        Console.WriteLine(
            $"Automation run completed. Products processed: {processedCount}. Products successfully saved: {savedCount}."
        );
        if (processedCount == productList.Count && readyForSaveCount == savedCount)
        {
            Console.WriteLine("All products processed and saved successfully where applicable.");
        }
        else
        {
            Console.WriteLine(
                $"Some products may have failed or were skipped. Total Attempted: {productList.Count}, Processed (incl. skips/fails before save): {processedCount}, Queued for Save: {readyForSaveCount}, Successfully Saved: {savedCount}"
            );
        }
    }
}
