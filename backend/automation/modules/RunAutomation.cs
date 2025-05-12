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
        List<dynamic> productList,
        IPage initialPage,
        IBrowser browser,
        string threadCount,
        CancellationToken cancellationToken
    )
    {
        string productListUrl = initialPage.Url;
        var initialCookies = await initialPage.Context.CookiesAsync();
        int maxConcurrentProcessingTasks = int.TryParse(threadCount, out var tc) ? tc : 1;
        Console.WriteLine(
            $"Product list page URL: {productListUrl}. Retrieved {initialCookies.Count} cookies."
        );

        Console.WriteLine(
            $"Total products to process: {productList.Count}. Max concurrent processing tasks: {maxConcurrentProcessingTasks}"
        );

        processingSemaphore = new SemaphoreSlim(maxConcurrentProcessingTasks);
        int processedCount = 0;
        int readyForSaveCount = 0;
        int savedCount = 0;

        for (int i = 0; i < productList.Count; i += maxConcurrentProcessingTasks)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                Console.WriteLine("Cancellation requested before starting new batch processing.");
                break;
            }

            var batchProducts = productList.Skip(i).Take(maxConcurrentProcessingTasks).ToList();
            var batchProcessingTasks = new List<Task>();

            Console.WriteLine(
                $"Starting processing for batch {i / maxConcurrentProcessingTasks + 1}, {batchProducts.Count} products."
            );

            foreach (var product in batchProducts)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    Console.WriteLine(
                        $"[Task] Cancellation requested before processing product: {product.ItemName?.ToString() ?? "Unknown Product"}. Halting current batch task creation."
                    );
                    break;
                }

                await processingSemaphore.WaitAsync(cancellationToken);

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
                            cancellationToken.ThrowIfCancellationRequested();
                            Console.WriteLine(
                                $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Acquired PROCESSING semaphore for: {currentProductName}"
                            );
                            taskContext = await browser.NewContextAsync(
                                new BrowserNewContextOptions()
                            );
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

                            cancellationToken.ThrowIfCancellationRequested();
                            productListPage = await taskContext.NewPageAsync();
                            Console.WriteLine(
                                $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Navigating to product list page for {currentProductName}"
                            );
                            await productListPage.GotoAsync(
                                productListUrl,
                                new PageGotoOptions
                                {
                                    WaitUntil = WaitUntilState.DOMContentLoaded,
                                    Timeout = 30000,
                                }
                            );
                            Console.WriteLine(
                                $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Navigation complete for {currentProductName}"
                            );

                            cancellationToken.ThrowIfCancellationRequested();
                            Console.WriteLine(
                                $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Calling ProcessProductsAsync for {currentProductName}"
                            );
                            ProcessProducts processProducts = new ProcessProducts();
                            detailPageToSave = await processProducts.ProcessProductsAsync(
                                product,
                                productListPage,
                                currentTaskId,
                                cancellationToken
                            );

                            if (cancellationToken.IsCancellationRequested)
                            {
                                Console.WriteLine(
                                    $"[Task {currentTaskId}] Cancellation after ProcessProductsAsync for {currentProductName}. Not queueing."
                                );
                                if (detailPageToSave != null && !detailPageToSave.IsClosed)
                                    await detailPageToSave.CloseAsync();
                                return;
                            }

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
                                if (taskContext != null)
                                {
                                    await taskContext.CloseAsync();
                                    taskContext = null;
                                }
                            }
                        }
                        catch (OperationCanceledException)
                        {
                            Console.WriteLine(
                                $"[Task {currentTaskId}] Task for {currentProductName} was cancelled during processing."
                            );
                            Interlocked.Increment(ref processedCount);
                            if (detailPageToSave != null && !detailPageToSave.IsClosed)
                                await detailPageToSave.CloseAsync();
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine(
                                $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Error in processing task for {currentProductName}: {ex.ToString()}"
                            );
                            Interlocked.Increment(ref processedCount);
                            if (detailPageToSave != null && !detailPageToSave.IsClosed)
                                await detailPageToSave.CloseAsync();
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
                                        $"[Task {currentTaskId}] Error closing taskContext in finally: {ex.Message}"
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

            if (cancellationToken.IsCancellationRequested)
            {
                Console.WriteLine(
                    $"Cancellation detected after batch {i / maxConcurrentProcessingTasks + 1} processing. Draining save queue without saving."
                );
                while (pagesToSaveQueue.TryDequeue(out var itemToDiscard))
                {
                    Console.WriteLine(
                        $"[Cancellation] Discarding {itemToDiscard.Item3} from save queue."
                    );
                    if (itemToDiscard.Item1 != null && !itemToDiscard.Item1.IsClosed)
                        await itemToDiscard.Item1.CloseAsync();
                    if (itemToDiscard.Item2 != null)
                        await itemToDiscard.Item2.CloseAsync();
                }
                break;
            }

            Console.WriteLine(
                $"Processing phase for batch {i / maxConcurrentProcessingTasks + 1} completed. {pagesToSaveQueue.Count} items currently in save queue."
            );

            while (pagesToSaveQueue.TryDequeue(out var saveCandidate))
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    Console.WriteLine(
                        $"[SaveTask] Cancellation requested before saving {saveCandidate.Item3}. Discarding."
                    );
                    if (saveCandidate.Item1 != null && !saveCandidate.Item1.IsClosed)
                        await saveCandidate.Item1.CloseAsync();
                    if (saveCandidate.Item2 != null)
                        await saveCandidate.Item2.CloseAsync();
                    continue;
                }

                IPage detailPage = saveCandidate.Item1;
                IBrowserContext contextToClose = saveCandidate.Item2;
                string productName = saveCandidate.Item3;
                int originalTaskId = saveCandidate.Item4;

                await saveSemaphore.WaitAsync(cancellationToken);
                Console.WriteLine(
                    $"[SaveTask (from Task {originalTaskId}) - {DateTime.Now:HH:mm:ss.fff}] Acquired SAVE semaphore for: {productName}"
                );
                try
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    if (detailPage != null && !detailPage.IsClosed)
                    {
                        Console.WriteLine(
                            $"[SaveTask (from Task {originalTaskId}) - {DateTime.Now:HH:mm:ss.fff}] Attempting to Save & Exit for product {productName}"
                        );
                        await detailPage
                            .Locator("input[value=\"Save & Exit\"]")
                            .ClickAsync(new LocatorClickOptions { Timeout = 20000 });

                        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
                        while (stopwatch.ElapsedMilliseconds < 15000 && !detailPage.IsClosed)
                        {
                            if (cancellationToken.IsCancellationRequested)
                                break;
                            await Task.Delay(500, cancellationToken);
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
                            if (!detailPage.IsClosed)
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
                catch (OperationCanceledException)
                {
                    Console.WriteLine(
                        $"[SaveTask (from Task {originalTaskId})] Save for {productName} cancelled."
                    );
                    if (detailPage != null && !detailPage.IsClosed)
                        await detailPage.CloseAsync();
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
            if (cancellationToken.IsCancellationRequested)
            {
                Console.WriteLine(
                    "Cancellation detected after save loop. Exiting batch processing."
                );
                break;
            }
            Console.WriteLine(
                $"Save loop for batch {i / maxConcurrentProcessingTasks + 1} completed."
            );
        }

        Console.WriteLine(
            $"Automation run finished. Products processed: {processedCount}. Products successfully saved: {savedCount}."
        );
        if (cancellationToken.IsCancellationRequested)
            Console.WriteLine("Automation was cancelled by request.");
    }
}
