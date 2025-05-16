using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using backend.automation.modules;
using DotNetEnv;
using Microsoft.Playwright;

class runAuto
{
    private SemaphoreSlim? processingSemaphore;
    private SemaphoreSlim saveSemaphore = new SemaphoreSlim(1, 1);
    private bool _criticalFailureEmailSentThisRun = false;

    private ConcurrentQueue<Tuple<IPage, IBrowserContext, string, int>> pagesToSaveQueue =
        new ConcurrentQueue<Tuple<IPage, IBrowserContext, string, int>>();

    private Func<string, Task> _signalRLogger = async (msg) =>
    {
        await Task.CompletedTask;
    };

    public async Task RunAutomation(
        List<dynamic> productList,
        IPage initialPage,
        IBrowser browser,
        string threadCount,
        CancellationToken cancellationToken,
        Func<string, Task> signalRLogger
    )
    {
        this._signalRLogger = signalRLogger ?? (async (msg) => await Task.CompletedTask);
        this._criticalFailureEmailSentThisRun = false;

        var emailService = new SendEmailResults(this._signalRLogger);

        string productListUrl = initialPage.Url;
        var initialCookies = await initialPage.Context.CookiesAsync();
        int maxConcurrentProcessingTasks = int.TryParse(threadCount, out var tc) ? tc : 1;

        var initialMessage =
            $"Product list page URL: {productListUrl}. Retrieved {initialCookies.Count} cookies.";
        Console.WriteLine(initialMessage);
        await _signalRLogger($"[Automation] {initialMessage}");

        var totalProductsMessage =
            $"Total products to process: {productList.Count}. Max concurrent processing tasks: {maxConcurrentProcessingTasks}";
        Console.WriteLine(totalProductsMessage);
        await _signalRLogger($"[Automation] {totalProductsMessage}");

        processingSemaphore = new SemaphoreSlim(maxConcurrentProcessingTasks);
        int processedCount = 0;
        int readyForSaveCount = 0;
        int savedCount = 0;

        int logicalTaskCounter = 0;

        for (int i = 0; i < productList.Count; i += maxConcurrentProcessingTasks)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                Console.WriteLine(
                    "[Automation] [Error] Cancellation requested before starting new batch processing."
                );
                await _signalRLogger(
                    "[Automation] [Error] Cancellation requested before starting new batch processing."
                );
                break;
            }

            var batchProducts = productList.Skip(i).Take(maxConcurrentProcessingTasks).ToList();
            var batchProcessingTasks = new List<Task>();

            var batchStartMessage =
                $"Starting processing for batch {i / maxConcurrentProcessingTasks + 1}, {batchProducts.Count} products.";
            Console.WriteLine(batchStartMessage);
            await _signalRLogger($"[Automation] {batchStartMessage}");

            foreach (var product in batchProducts)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    var cancellationMessage =
                        $"[Task] [Error] Cancellation requested before processing product: {product.ItemName?.ToString() ?? "Unknown Product"}. Halting current batch task creation.";
                    Console.WriteLine(cancellationMessage);
                    await _signalRLogger($"[Automation] {cancellationMessage}");
                    break;
                }

                await processingSemaphore.WaitAsync(cancellationToken);

                int taskSpecificLogicalId = Interlocked.Increment(ref logicalTaskCounter);

                batchProcessingTasks.Add(
                    Task.Run(async () =>
                    {
                        IBrowserContext? taskContext = null;
                        IPage? productListPage = null;
                        IPage? detailPageToSave = null;

                        int currentTaskId = taskSpecificLogicalId;
                        string currentProductName =
                            product.ItemName?.ToString() ?? "Unknown Product";

                        try
                        {
                            cancellationToken.ThrowIfCancellationRequested();
                            string logMsg =
                                $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Acquired PROCESSING semaphore for: {currentProductName}";
                            Console.WriteLine(logMsg);
                            await _signalRLogger($"[Automation] {logMsg}");

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
                            var navigationMessage =
                                $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Navigating to product list page for {currentProductName}";
                            Console.WriteLine(navigationMessage);
                            await _signalRLogger($"[Automation] {navigationMessage}");

                            await productListPage.GotoAsync(
                                productListUrl,
                                new PageGotoOptions
                                {
                                    WaitUntil = WaitUntilState.DOMContentLoaded,
                                    Timeout = 30000,
                                }
                            );
                            var navigationCompleteMessage =
                                $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Navigation complete for {currentProductName}";
                            Console.WriteLine(navigationCompleteMessage);
                            await _signalRLogger($"[Automation] {navigationCompleteMessage}");

                            cancellationToken.ThrowIfCancellationRequested();
                            var processProductsMessage =
                                $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Calling ProcessProductsAsync for {currentProductName}";
                            Console.WriteLine(processProductsMessage);
                            await _signalRLogger($"[Automation] {processProductsMessage}");

                            ProcessProducts processProducts = new ProcessProducts();
                            detailPageToSave = await processProducts.ProcessProductsAsync(
                                product,
                                productListPage,
                                currentTaskId,
                                cancellationToken,
                                this._signalRLogger
                            );

                            if (cancellationToken.IsCancellationRequested)
                            {
                                var cancellationAfterProcessMessage =
                                    $"[Task {currentTaskId}] [Error] Cancellation after ProcessProductsAsync for {currentProductName}. Not queueing.";
                                Console.WriteLine(cancellationAfterProcessMessage);
                                await _signalRLogger(
                                    $"[Automation] {cancellationAfterProcessMessage}"
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
                                var readyForSaveMessage =
                                    $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Product {currentProductName} is ready and queued for saving.";
                                Console.WriteLine(readyForSaveMessage);
                                await _signalRLogger($"[Automation] {readyForSaveMessage}");
                            }
                            else
                            {
                                var skippedMessage =
                                    $"[Task {currentTaskId}] [Error] Product {currentProductName} was skipped or failed processing before save.";
                                Console.WriteLine(skippedMessage);
                                await _signalRLogger($"[Automation] {skippedMessage}");
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
                            var cancelledTaskMessage =
                                $"[Task {currentTaskId}] [Error] Task for {currentProductName} was cancelled during processing.";
                            Console.WriteLine(cancelledTaskMessage);
                            await _signalRLogger($"[Automation] {cancelledTaskMessage}");
                            Interlocked.Increment(ref processedCount);
                            if (detailPageToSave != null && !detailPageToSave.IsClosed)
                                await detailPageToSave.CloseAsync();
                        }
                        catch (Exception ex)
                        {
                            var errorMessage =
                                $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] [Error] Error in processing task for {currentProductName}: {ex.ToString()}";
                            Console.WriteLine(errorMessage);
                            await _signalRLogger($"[Automation] {errorMessage}");
                            Interlocked.Increment(ref processedCount);
                            if (detailPageToSave != null && !detailPageToSave.IsClosed)
                                await detailPageToSave.CloseAsync();

                            if (
                                !_criticalFailureEmailSentThisRun
                                && !cancellationToken.IsCancellationRequested
                            )
                            {
                                _criticalFailureEmailSentThisRun = true;
                                await emailService.SendNotificationEmailAsync(
                                    logicalTaskCounter,
                                    productList,
                                    true,
                                    ex.ToString(),
                                    currentProductName
                                );
                            }
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
                                    var closeErrorMessage =
                                        $"[Task {currentTaskId}] [Error] Error closing productListPage: {ex.Message}";
                                    Console.WriteLine(closeErrorMessage);
                                    await _signalRLogger($"[Automation] {closeErrorMessage}");
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
                                    var contextCloseErrorMessage =
                                        $"[Task {currentTaskId}] [Error] Error closing taskContext in finally when detailPageToSave is null: {ex.Message}";
                                    Console.WriteLine(contextCloseErrorMessage);
                                    await _signalRLogger(
                                        $"[Automation] {contextCloseErrorMessage}"
                                    );
                                }
                            }
                            else if (detailPageToSave != null)
                            {
                                var contextCloseAfterSaveMessage =
                                    $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] TaskContext for {currentProductName} will be closed after save by the save loop.";
                                Console.WriteLine(contextCloseAfterSaveMessage);
                                await _signalRLogger(
                                    $"[Automation] {contextCloseAfterSaveMessage}"
                                );
                            }

                            processingSemaphore.Release();
                            var semaphoreReleaseMessage =
                                $"[Task {currentTaskId} - {DateTime.Now:HH:mm:ss.fff}] Released PROCESSING semaphore for: {currentProductName}";
                            Console.WriteLine(semaphoreReleaseMessage);
                            await _signalRLogger($"[Automation] {semaphoreReleaseMessage}");
                        }
                    })
                );
            }

            await Task.WhenAll(batchProcessingTasks);

            if (cancellationToken.IsCancellationRequested)
            {
                var cancellationAfterBatchMessage =
                    $"[Automation] [Error] Cancellation detected after batch {i / maxConcurrentProcessingTasks + 1} processing. Draining save queue without saving.";
                Console.WriteLine(cancellationAfterBatchMessage);
                await _signalRLogger(cancellationAfterBatchMessage);
                while (pagesToSaveQueue.TryDequeue(out var itemToDiscard))
                {
                    var discardMessage =
                        $"[Cancellation] [Error] Discarding {itemToDiscard.Item3} from save queue due to cancellation.";
                    Console.WriteLine(discardMessage);
                    await _signalRLogger($"[Automation] {discardMessage}");
                    if (itemToDiscard.Item1 != null && !itemToDiscard.Item1.IsClosed)
                        await itemToDiscard.Item1.CloseAsync();
                    if (itemToDiscard.Item2 != null)
                        await itemToDiscard.Item2.CloseAsync();
                }
                break;
            }

            var processingPhaseCompleteMessage =
                $"Processing phase for batch {i / maxConcurrentProcessingTasks + 1} completed. {pagesToSaveQueue.Count} items currently in save queue.";
            Console.WriteLine(processingPhaseCompleteMessage);
            await _signalRLogger($"[Automation] {processingPhaseCompleteMessage}");

            while (pagesToSaveQueue.TryDequeue(out var saveCandidate))
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    var saveCancellationMessage =
                        $"[SaveTask] [Error] Cancellation requested before saving {saveCandidate.Item3}. Discarding.";
                    Console.WriteLine(saveCancellationMessage);
                    await _signalRLogger($"[Automation] {saveCancellationMessage}");
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
                var saveSemaphoreMessage =
                    $"[SaveTask (from Task {originalTaskId}) - {DateTime.Now:HH:mm:ss.fff}] Acquired SAVE semaphore for: {productName}";
                Console.WriteLine(saveSemaphoreMessage);
                await _signalRLogger($"[Automation] {saveSemaphoreMessage}");
                try
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    if (detailPage != null && !detailPage.IsClosed)
                    {
                        var saveAttemptMessage =
                            $"[SaveTask (from Task {originalTaskId}) - {DateTime.Now:HH:mm:ss.fff}] Attempting to Save & Exit for product {productName}";
                        Console.WriteLine(saveAttemptMessage);
                        await _signalRLogger(
                            $"[USER] SAVE_ATTEMPT: Product '{productName}' (Task {originalTaskId})"
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
                            var successMsg =
                                $"[SaveTask (from Task {originalTaskId})] Successfully saved and closed page for {productName}.";
                            Console.WriteLine(successMsg);
                            await _signalRLogger(
                                $"[USER] SAVE_SUCCESS: Product '{productName}' (Task {originalTaskId}) saved."
                            );
                            Interlocked.Increment(ref savedCount);
                        }
                        else
                        {
                            var notClosedMsg =
                                $"[SaveTask (from Task {originalTaskId})] [Error] Page for {productName} did not close after save attempt.";
                            Console.WriteLine(notClosedMsg);
                            await _signalRLogger(
                                $"[USER] [Error] SAVE_WARN: Product '{productName}' (Task {originalTaskId}) page did not close as expected after save attempt."
                            );
                            if (!detailPage.IsClosed)
                                await detailPage.CloseAsync();
                        }
                    }
                    else
                    {
                        var noPageMsg =
                            $"[SaveTask (from Task {originalTaskId})] [Error] Detail page for {productName} was null or already closed before save attempt.";
                        Console.WriteLine(noPageMsg);
                        await _signalRLogger(
                            $"[USER] [Error] SAVE_FAIL: Product '{productName}' (Task {originalTaskId}) - Page not available for saving."
                        );
                    }
                }
                catch (OperationCanceledException)
                {
                    var cancelMessage =
                        $"[SaveTask (from Task {originalTaskId})] [Error] Operation cancelled while attempting to save {productName}.";
                    Console.WriteLine(cancelMessage);
                    await _signalRLogger(
                        $"[USER] [Error] SAVE_CANCELLED: Product '{productName}' (Task {originalTaskId}) - Save cancelled."
                    );
                    if (detailPage != null && !detailPage.IsClosed)
                    {
                        await detailPage.CloseAsync();
                    }
                }
                catch (Exception ex)
                {
                    var exMessage =
                        $"[SaveTask (from Task {originalTaskId})] [Error] Error saving product {productName}: {ex.Message}";
                    Console.WriteLine(exMessage);
                    await _signalRLogger(
                        $"[USER] [Error] SAVE_FAIL: Product '{productName}' (Task {originalTaskId}) - Error during save: {ex.Message.Split('\n')[0]}"
                    );
                    if (detailPage != null && !detailPage.IsClosed)
                    {
                        await detailPage.CloseAsync();
                    }
                }
                finally
                {
                    if (contextToClose != null)
                    {
                        var contextCloseMessage =
                            $"[SaveTask (from Task {originalTaskId}) - {DateTime.Now:HH:mm:ss.fff}] Closing browser context for {productName}.";
                        Console.WriteLine(contextCloseMessage);
                        await _signalRLogger($"[Automation] {contextCloseMessage}");
                        try
                        {
                            await contextToClose.CloseAsync();
                        }
                        catch (Exception ctxCloseEx)
                        {
                            var ctxCloseErrorMessage =
                                $"[SaveTask (from Task {originalTaskId})] [Error] Error closing contextToClose for {productName}: {ctxCloseEx.Message}";
                            Console.WriteLine(ctxCloseErrorMessage);
                            await _signalRLogger($"[Automation] {ctxCloseErrorMessage}");
                        }
                    }
                    saveSemaphore.Release();
                    var saveSemaphoreReleaseMessage =
                        $"[SaveTask (from Task {originalTaskId}) - {DateTime.Now:HH:mm:ss.fff}] Released SAVE semaphore for: {productName}";
                    Console.WriteLine(saveSemaphoreReleaseMessage);
                    await _signalRLogger($"[Automation] {saveSemaphoreReleaseMessage}");
                    Interlocked.Increment(ref processedCount);
                }
            }

            if (cancellationToken.IsCancellationRequested)
            {
                var cancellationAfterSaveMessage =
                    "[Automation] [Error] Cancellation detected after save loop. Exiting batch processing.";
                Console.WriteLine(cancellationAfterSaveMessage);
                await _signalRLogger(cancellationAfterSaveMessage);
                break;
            }
            var saveLoopCompleteMessage =
                $"Save loop for batch {i / maxConcurrentProcessingTasks + 1} completed.";
            Console.WriteLine(saveLoopCompleteMessage);
            await _signalRLogger($"[Automation] {saveLoopCompleteMessage}");
        }

        var finalMessage =
            $"Automation run finished. Products processed (attempted save or skipped): {processedCount}. Products successfully saved: {savedCount}.";
        Console.WriteLine(finalMessage);
        await _signalRLogger($"[Automation Completed] {finalMessage}");
        if (cancellationToken.IsCancellationRequested)
        {
            var cancellationMessage = "[Automation] [Error] Automation was cancelled by request.";
            Console.WriteLine(cancellationMessage);
            await _signalRLogger(cancellationMessage);
        }
        else if (!_criticalFailureEmailSentThisRun && savedCount > 0)
        {
            await emailService.SendNotificationEmailAsync(savedCount, productList, false);
        }
    }
}
