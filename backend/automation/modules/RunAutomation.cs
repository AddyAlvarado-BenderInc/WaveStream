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
    private SemaphoreSlim processingSemaphore;

    private SemaphoreSlim saveSemaphore = new SemaphoreSlim(1, 1);

    private ConcurrentQueue<Tuple<IPage, string, int>> pagesToSaveQueue =
        new ConcurrentQueue<Tuple<IPage, string, int>>();

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

        Console.WriteLine($"Total products to process: {products.Count}");

        processingSemaphore = new SemaphoreSlim(maxConcurrentProcessingTasks);
        var processingTasks = new List<Task>();
        int processedCount = 0;
        int readyForSaveCount = 0;

        foreach (var product in products)
        {
            await processingSemaphore.WaitAsync();

            processingTasks.Add(
                Task.Run(async () =>
                {
                    IBrowserContext? taskContext = null;
                    IPage? productListPage = null;
                    int currentTaskId =
                        Task.CurrentId ?? System.Threading.Thread.CurrentThread.ManagedThreadId;
                    string currentProductName = product.ItemName?.ToString() ?? "Unknown Product";

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
                        await productListPage.GotoAsync(
                            productListUrl,
                            new PageGotoOptions
                            {
                                WaitUntil = WaitUntilState.NetworkIdle,
                                Timeout = 30000,
                            }
                        );

                        Console.WriteLine(
                            $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Calling ProcessProductsAsync for {currentProductName}"
                        );
                        ProcessProducts processProducts = new ProcessProducts();
                        IPage? detailPageToSave = await processProducts.ProcessProductsAsync(
                            product,
                            productListPage,
                            currentTaskId
                        );

                        if (detailPageToSave != null)
                        {
                            pagesToSaveQueue.Enqueue(
                                Tuple.Create(detailPageToSave, currentProductName, currentTaskId)
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
                            await productListPage.CloseAsync();
                        if (taskContext != null)
                            await taskContext.CloseAsync();
                        processingSemaphore.Release();
                        Console.WriteLine(
                            $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Released PROCESSING semaphore for: {currentProductName}"
                        );
                    }
                })
            );
        }

        await Task.WhenAll(processingTasks);
        Console.WriteLine(
            $"All {processingTasks.Count} product processing tasks have been initiated. {readyForSaveCount} products are queued for saving."
        );

        int savedCount = 0;
        while (pagesToSaveQueue.TryDequeue(out var saveCandidate))
        {
            IPage detailPage = saveCandidate.Item1;
            string productName = saveCandidate.Item2;
            int originalTaskId = saveCandidate.Item3;

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
                        savedCount++;
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
                    catch
                    {
                        Console.WriteLine(
                            $"[SaveTask (from Task {originalTaskId}) - {DateTime.Now:HH:mm:ss.fff}] Error closing detail page for {productName} after save attempt."
                        );
                    }
                }
            }
            finally
            {
                Interlocked.Increment(ref processedCount);
                saveSemaphore.Release();
                Console.WriteLine(
                    $"[SaveTask (from Task {originalTaskId}) - {DateTime.Now:HH:mm:ss.fff}] Released SAVE semaphore for: {productName}. Total processed: {processedCount}/{products.Count}"
                );
            }
        }

        await initialPage.CloseAsync();

        Console.WriteLine(
            $"Automation run completed. Products processed: {processedCount}. Products successfully saved: {savedCount}."
        );
        if (processedCount == products.Count)
        {
            Console.WriteLine("All products processed successfully.");
        }
        else
        {
            Console.WriteLine(
                $"Some products may have failed. Processed: {processedCount}, Total: {products.Count}"
            );
        }
    }
}
