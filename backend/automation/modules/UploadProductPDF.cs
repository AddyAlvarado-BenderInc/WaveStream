using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Playwright;
using Newtonsoft.Json.Linq;

namespace backend.automation.modules
{
    public class UploadProductPDF
    {
        private const string DefaultFileDeleteButtonSelector =
            "input[name=\"ctl00$ctl00$C$M$ctl00$W$ctl02$FilesAddedToJob1$FileRepeater$ctl01$UF$DEL\"]";
        private const string DefaultUploadPDFInputSelector =
            "#ctl00_ctl00_C_M_ctl00_W_ctl02_Fileupload1_htmlInputFileUpload";
        private const string DefaultUploadPDFButtonSelector =
            "#ctl00_ctl00_C_M_ctl00_W_ctl02_Fileupload1_ButtonUpload";

        public async Task ClearAllPDFs(
            int taskId,
            IPage page,
            Func<string, Task> signalRLogger,
            string fileDeleteButtonSelector = DefaultFileDeleteButtonSelector,
            int maxDeleteAttempts = 15
        )
        {
            int currentDeleteAttempt = 0;
            try
            {
                await signalRLogger(
                    $"[Task {taskId}] Initiating PDF deletion phase. Max attempts: {maxDeleteAttempts}."
                );
                Console.WriteLine(
                    $"[Task {taskId}] Initiating PDF deletion phase. Max attempts: {maxDeleteAttempts}."
                );

                while (currentDeleteAttempt < maxDeleteAttempts)
                {
                    var deleteButtonLocator = page.Locator(fileDeleteButtonSelector);

                    try
                    {
                        await deleteButtonLocator.WaitForAsync(
                            new LocatorWaitForOptions
                            {
                                State = WaitForSelectorState.Visible,
                                Timeout = 3000,
                            }
                        );
                    }
                    catch (TimeoutException)
                    {
                        await signalRLogger(
                            $"[Task {taskId}] Delete button ('{fileDeleteButtonSelector}') not visible. Assuming no more PDFs to delete. (Attempt: {currentDeleteAttempt + 1})"
                        );
                        Console.WriteLine(
                            $"[Task {taskId}] Delete button ('{fileDeleteButtonSelector}') not visible. Assuming no more PDFs to delete. (Attempt: {currentDeleteAttempt + 1})"
                        );
                        break;
                    }

                    EventHandler<IDialog>? dialogHandler = null;
                    dialogHandler = async (sender, dialog) =>
                    {
                        await signalRLogger(
                            $"[Task {taskId}] Dialog message: {dialog.Message}, Type: {dialog.Type}"
                        );
                        Console.WriteLine($"[Task {taskId}] Dialog message: {dialog.Message}");
                        try
                        {
                            await dialog.AcceptAsync();
                            await signalRLogger($"[Task {taskId}] Dialog accepted.");
                            Console.WriteLine($"[Task {taskId}] Dialog accepted.");
                        }
                        catch (Exception ex)
                        {
                            await signalRLogger(
                                $"[Task {taskId}] Error accepting dialog: {ex.Message}"
                            );
                            Console.WriteLine(
                                $"[Task {taskId}] Error accepting dialog: {ex.Message}"
                            );
                        }
                        finally
                        {
                            if (page != null && !page.IsClosed && dialogHandler != null)
                            {
                                page.Dialog -= dialogHandler;
                            }
                        }
                    };
                    page.Dialog += dialogHandler;

                    try
                    {
                        await signalRLogger(
                            $"[Task {taskId}] Clicking PDF delete button (Attempt {currentDeleteAttempt + 1}/{maxDeleteAttempts})."
                        );
                        Console.WriteLine(
                            $"[Task {taskId}] Clicking PDF delete button (Attempt {currentDeleteAttempt + 1}/{maxDeleteAttempts})."
                        );
                        await deleteButtonLocator.ClickAsync(
                            new LocatorClickOptions { Timeout = 10000 }
                        );

                        await page.WaitForLoadStateAsync(
                            LoadState.NetworkIdle,
                            new PageWaitForLoadStateOptions { Timeout = 15000 }
                        );
                        await signalRLogger(
                            $"[Task {taskId}] PDF delete click action completed and page settled (Attempt {currentDeleteAttempt + 1})."
                        );
                        Console.WriteLine(
                            $"[Task {taskId}] PDF delete click action completed and page settled (Attempt {currentDeleteAttempt + 1})."
                        );
                    }
                    catch (Exception ex)
                    {
                        await signalRLogger(
                            $"[Task {taskId}] Error clicking delete button or during post-click operation (Attempt {currentDeleteAttempt + 1}): {ex.Message}"
                        );
                        Console.WriteLine(
                            $"[Task {taskId}] Error clicking delete button or during post-click operation (Attempt {currentDeleteAttempt + 1}): {ex.Message}"
                        );
                        if (page != null && !page.IsClosed && dialogHandler != null)
                        {
                            page.Dialog -= dialogHandler;
                        }
                        break;
                    }
                    currentDeleteAttempt++;
                }

                if (currentDeleteAttempt >= maxDeleteAttempts)
                {
                    await signalRLogger(
                        $"[Task {taskId}] Reached max PDF delete attempts ({maxDeleteAttempts}). There might still be files left."
                    );
                    Console.WriteLine(
                        $"[Task {taskId}] Reached max PDF delete attempts ({maxDeleteAttempts}). There might still be files left."
                    );
                }
                else
                {
                    await signalRLogger(
                        $"[Task {taskId}] PDF deletion phase completed. Total attempts: {currentDeleteAttempt}."
                    );
                    Console.WriteLine(
                        $"[Task {taskId}] PDF deletion phase completed. Total attempts: {currentDeleteAttempt}."
                    );
                }
            }
            catch (Exception ex)
            {
                await signalRLogger(
                    $"[Task {taskId}] General error in ClearAllPDFs: {ex.Message}."
                );
                Console.WriteLine(
                    $"[Task {taskId}] General error in ClearAllPDFs: {ex.Message}. StackTrace: {ex.StackTrace}"
                );

                throw;
            }
        }

        public async Task UploadPDFAsync(
            int taskId,
            IPage page,
            string productName,
            string productType,
            dynamic pdfData,
            Func<string, Task> signalRLogger,
            string pdfsDirectory = "pdfs"
        )
        {
            await signalRLogger($"[Task {taskId}] -- Entering UploadPDFAsync for {productName} --");
            Console.WriteLine($"[Task {taskId}] -- Entering UploadPDFAsync for {productName} --");

            if (productType is "Non Printed Products" or "Ad Hoc" or "Product Matrix")
            {
                await signalRLogger(
                    $"[Task {taskId}] PDF upload is not required for Product Type '{productType}'. Skipping."
                );
                Console.WriteLine(
                    $"[Task {taskId}] PDF upload is not required for Product Type '{productType}'. Skipping."
                );
                return;
            }

            JArray? pdfFilenames = null;

            if (pdfData is JArray ja)
            {
                pdfFilenames = ja;
            }
            else if (pdfData is JObject jo && jo["Composite"] is JArray compositeArray)
            {
                pdfFilenames = compositeArray;
            }
            else if (pdfData is string s && !string.IsNullOrEmpty(s))
            {
                pdfFilenames = new JArray(s);
            }
            else if (
                pdfData is JValue jv
                && jv.Type == JTokenType.String
                && !string.IsNullOrEmpty(jv.ToString())
            )
            {
                pdfFilenames = new JArray(jv.ToString());
            }

            if (pdfFilenames == null || !pdfFilenames.HasValues)
            {
                await signalRLogger(
                    $"[Task {taskId}] No valid PDF filenames provided for {productName}. Skipping upload."
                );
                Console.WriteLine(
                    $"[Task {taskId}] No valid PDF filenames provided for {productName}. Skipping upload."
                );
                return;
            }

            await signalRLogger(
                $"[Task {taskId}] Processing {pdfFilenames.Count} PDF entries for {productName}."
            );
            Console.WriteLine(
                $"[Task {taskId}] Processing {pdfFilenames.Count} PDF entries for {productName}."
            );

            try
            {
                await ClearAllPDFs(taskId, page, signalRLogger);
            }
            catch (Exception ex)
            {
                await signalRLogger(
                    $"[Task {taskId}] Failed to clear existing PDFs for {productName}. Aborting upload. Error: {ex.Message}"
                );
                Console.WriteLine(
                    $"[Task {taskId}] Failed to clear existing PDFs for {productName}. Aborting upload. Error: {ex.Message}"
                );
                return;
            }

            List<string> validFilePathsToUpload = new List<string>();
            foreach (JToken? pdfToken in pdfFilenames)
            {
                string? filename = pdfToken?.ToString();
                if (string.IsNullOrEmpty(filename))
                {
                    await signalRLogger(
                        $"[Task {taskId}] Encountered an empty PDF filename for {productName}. Skipping this entry."
                    );
                    Console.WriteLine(
                        $"[Task {taskId}] Encountered an empty PDF filename for {productName}. Skipping this entry."
                    );
                    continue;
                }

                string filePath = Path.GetFullPath(
                    Path.Combine(AppDomain.CurrentDomain.BaseDirectory, pdfsDirectory, filename)
                );

                if (File.Exists(filePath))
                {
                    validFilePathsToUpload.Add(filePath);
                }
                else
                {
                    await signalRLogger(
                        $"[Task {taskId}] PDF file not found at '{filePath}' for {productName}. Skipping this file."
                    );
                    Console.WriteLine(
                        $"[Task {taskId}] PDF file not found at '{filePath}' for {productName}. Skipping this file."
                    );
                }
            }

            if (!validFilePathsToUpload.Any())
            {
                await signalRLogger(
                    $"[Task {taskId}] No valid PDF files found to upload for {productName} after checking paths."
                );
                Console.WriteLine(
                    $"[Task {taskId}] No valid PDF files found to upload for {productName} after checking paths."
                );
                return;
            }

            await signalRLogger(
                $"[Task {taskId}] Attempting to upload {validFilePathsToUpload.Count} valid PDF(s) for {productName}."
            );
            Console.WriteLine(
                $"[Task {taskId}] Attempting to upload {validFilePathsToUpload.Count} valid PDF(s) for {productName}."
            );

            foreach (string filePathToUpload in validFilePathsToUpload)
            {
                try
                {
                    await signalRLogger(
                        $"[Task {taskId}] Uploading PDF: {Path.GetFileName(filePathToUpload)} for {productName} from {filePathToUpload}"
                    );
                    Console.WriteLine(
                        $"[Task {taskId}] Uploading PDF: {Path.GetFileName(filePathToUpload)} for {productName}"
                    );

                    var uploadInputLocator = page.Locator(DefaultUploadPDFInputSelector);
                    await uploadInputLocator.WaitForAsync(
                        new LocatorWaitForOptions
                        {
                            State = WaitForSelectorState.Visible,
                            Timeout = 10000,
                        }
                    );
                    await uploadInputLocator.SetInputFilesAsync(filePathToUpload);
                    await signalRLogger(
                        $"[Task {taskId}] File selected for upload: {Path.GetFileName(filePathToUpload)}"
                    );
                    Console.WriteLine(
                        $"[Task {taskId}] File selected for upload: {Path.GetFileName(filePathToUpload)}"
                    );

                    var uploadButtonLocator = page.Locator(DefaultUploadPDFButtonSelector);
                    await uploadButtonLocator.WaitForAsync(
                        new LocatorWaitForOptions
                        {
                            State = WaitForSelectorState.Visible,
                            Timeout = 10000,
                        }
                    );
                    await uploadButtonLocator.ClickAsync();
                    await signalRLogger($"[Task {taskId}] Clicked the PDF upload button.");
                    Console.WriteLine($"[Task {taskId}] Clicked the PDF upload button.");

                    await page.WaitForLoadStateAsync(
                        LoadState.NetworkIdle,
                        new PageWaitForLoadStateOptions { Timeout = 60000 }
                    );

                    await signalRLogger(
                        $"[Task {taskId}] Successfully uploaded {Path.GetFileName(filePathToUpload)} for {productName}."
                    );
                    Console.WriteLine(
                        $"[Task {taskId}] Successfully uploaded {Path.GetFileName(filePathToUpload)} for {productName}."
                    );
                }
                catch (Exception ex)
                {
                    await signalRLogger(
                        $"[Task {taskId}] Error uploading PDF '{Path.GetFileName(filePathToUpload)}' for {productName}. Error: {ex.Message}"
                    );
                    Console.WriteLine(
                        $"[Task {taskId}] Error uploading PDF '{Path.GetFileName(filePathToUpload)}' for {productName}. Error: {ex.Message}"
                    );
                }
            }

            await signalRLogger($"[Task {taskId}] -- Finished UploadPDFAsync for {productName} --");
            Console.WriteLine($"[Task {taskId}] -- Finished UploadPDFAsync for {productName} --");
        }
    }
}
