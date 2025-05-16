using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Playwright;
using Newtonsoft.Json.Linq;

namespace backend.automation.modules
{
    public class UploadProductIcon
    {
        public async Task<bool> ValidateIconAsync(string iconSrc, IPage page)
        {
            string blankImageSelector =
                "img[src=\"/DSF/Images/a6b0f33a-f440-4378-8e9a-bb320ee87610/Blanks/27.gif\"]";
            try
            {
                string blankImagePlaceholderOnPage = await page.EvalOnSelectorAsync<string>(
                    blankImageSelector,
                    "el => el.src"
                );

                if (!string.IsNullOrEmpty(iconSrc) && iconSrc != blankImagePlaceholderOnPage)
                {
                    // Console.WriteLine($"Icon src '{iconSrc}' is not the blank placeholder.");
                    return true;
                }
                else if (iconSrc == blankImagePlaceholderOnPage)
                {
                    // Console.WriteLine($"Icon src '{iconSrc}' is the blank placeholder.");
                    return false;
                }
                else
                {
                    // Console.WriteLine($"[Error] Icon src '{iconSrc}' is empty or invalid for comparison.");
                    return false;
                }
            }
            catch (PlaywrightException ex)
            {
                // Console.WriteLine($"[Error] Could not evaluate blank image selector or provided icon src for validation. Assuming not blank. Details: {ex.Message}");
                return true; // Assuming not blank if validation fails
            }
        }

        public bool EnsureFileExists(string filePath, string contextMessage)
        {
            if (System.IO.File.Exists(filePath))
            {
                // Console.WriteLine($"{contextMessage}: File exists at {filePath}");
                return true;
            }
            else
            {
                // Console.WriteLine($"[Error] {contextMessage}: File does not exist at {filePath}");
                return false;
            }
        }

        public async Task UploadFirstIcon(
            int taskId,
            JArray fileArray,
            IPage page,
            Func<string, Task> signalRLogger
        )
        {
            string editMainIconButtonSelector =
                "input[name=\"ctl00$ctl00$C$M$ctl00$W$ctl01$_BigIconByItself$EditProductImage\"]";
            string uploadMainIconRadioSelector =
                "#ctl00_ctl00_C_M_ctl00_W_ctl01__BigIconByItself_ProductIcon_rdbUploadIcon";
            string mainIconUploadInputSelector =
                "input[name=\"ctl00$ctl00$C$M$ctl00$W$ctl01$_BigIconByItself$ProductIcon$_uploadedFile$ctl01\"]";
            string useSameImageIconCheckboxSelector =
                "#ctl00_ctl00_C_M_ctl00_W_ctl01__BigIconByItself_ProductIcon_ChkUseSameImageIcon";
            string uploadMainIconButtonSelector =
                "input[name=\"ctl00$ctl00$C$M$ctl00$W$ctl01$_BigIconByItself$ProductIcon$Upload\"]";

            if (fileArray == null || fileArray.Count == 0)
            {
                throw new ArgumentException(
                    "File array for UploadFirstIcon is null or empty.",
                    nameof(fileArray)
                );
            }

            JToken firstIconToken = fileArray[0];
            if (firstIconToken == null || firstIconToken.Type == JTokenType.Null)
            {
                await signalRLogger( // Added logger here as it was missing
                    $"[Task {taskId}] [Error] First icon filename token in JArray is null for UploadFirstIcon."
                );
                throw new Exception("First icon filename token in JArray is null!");
            }
            string firstIconName = firstIconToken.ToString();
            if (string.IsNullOrEmpty(firstIconName))
            {
                await signalRLogger(
                    $"[Task {taskId}] [Error] First icon filename is empty in JArray for UploadFirstIcon."
                );
                throw new Exception("First icon filename is empty!");
            }

            string firstIconPath = Path.GetFullPath(
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "icons", firstIconName)
            );

            if (!EnsureFileExists(firstIconPath, $"[Task {taskId}] First icon path")) // Context added to EnsureFileExists
            {
                await signalRLogger(
                    $"[Task {taskId}] [Error] First icon file not found at: {firstIconPath}"
                );
                throw new System.IO.FileNotFoundException(
                    $"First icon file not found at: {firstIconPath}"
                );
            }

            try
            {
                await signalRLogger($"[Task {taskId}] Uploading first icon: {firstIconPath}");
                await page.Locator(editMainIconButtonSelector).ClickAsync();
                await page.Locator(uploadMainIconRadioSelector).ClickAsync();
                await page.Locator(mainIconUploadInputSelector).SetInputFilesAsync(firstIconPath);
                await page.Locator(useSameImageIconCheckboxSelector).ClickAsync();
                await page.Locator(uploadMainIconButtonSelector).ClickAsync();
                await signalRLogger(
                    $"[Task {taskId}] Main icon uploaded successfully with {firstIconPath}"
                );
            }
            catch (Exception ex)
            {
                await signalRLogger(
                    $"[Task {taskId}] [Error] Failed during UploadFirstIcon UI interaction for {firstIconPath}: {ex.Message.Split('\n')[0]}"
                );
                throw;
            }
        }

        public async Task<bool> UploadMultipleIcons(
            int taskId,
            JArray fileArray,
            IPage page,
            Func<string, Task> signalRLogger
        )
        {
            string persistentDeleteButtonSelector =
                "input[name=\"ctl00$ctl00$C$M$ctl00$W$ctl01$_MultipleImagesUpload$ImagesPreview$ctl01$ctl01\"]";
            string imagePreviewSelector = ".multiple-images-container-action";
            string uploadMultipleImagesRadioSelector =
                "#ctl00_ctl00_C_M_ctl00_W_ctl01__MultipleImagesUpload_RadioUploadMultipleImages";
            string multipleImagesUploadInputSelector =
                "#ctl00_ctl00_C_M_ctl00_W_ctl01__MultipleImagesUpload_UploadImages";
            string uploadMultipleImagesButtonSelector =
                "input[name=\"ctl00$ctl00$C$M$ctl00$W$ctl01$_MultipleImagesUpload$UploadedFile\"]";
            int maxDeleteAttempts = 15;
            int currentDeleteAttempts = 0;

            while (currentDeleteAttempts < maxDeleteAttempts)
            {
                int imageCount = 0;
                try
                {
                    imageCount = await page.Locator(imagePreviewSelector).CountAsync();
                    if (imageCount > 0)
                    {
                        await signalRLogger(
                            $"[Task {taskId}] Found {imageCount} existing images. Attempting to delete..."
                        );
                    }
                }
                catch (PlaywrightException)
                {
                    await signalRLogger(
                        $"[Task {taskId}] [Error] Image preview selector {imagePreviewSelector} not found or evaluation failed. Assuming no images to delete."
                    );
                    imageCount = 0;
                }

                if (imageCount == 0)
                {
                    await signalRLogger($"[Task {taskId}] No more visible images to delete.");
                    break;
                }

                try
                {
                    await signalRLogger(
                        $"[Task {taskId}] Attempting to click delete button. Attempt #{currentDeleteAttempts + 1}"
                    );
                    await page.Locator(persistentDeleteButtonSelector)
                        .ClickAsync(new LocatorClickOptions { Timeout = 5000 });
                    // Console.WriteLine($"[Task {taskId}] Delete button clicked."); // Redundant
                    await page.WaitForLoadStateAsync(
                        LoadState.NetworkIdle,
                        new PageWaitForLoadStateOptions { Timeout = 5000 }
                    );
                }
                catch (Exception ex)
                {
                    await signalRLogger(
                        $"[Task {taskId}] [Error] Error clicking delete button or waiting after delete. Attempt #{currentDeleteAttempts + 1}: {ex.Message.Split('\n')[0]}"
                    );
                    break;
                }
                currentDeleteAttempts++;
            }

            if (currentDeleteAttempts >= maxDeleteAttempts)
            {
                await signalRLogger(
                    $"[Task {taskId}] [Error] Max delete attempts reached ({maxDeleteAttempts}). Stopping deletion process."
                );
            }

            await signalRLogger(
                $"[Task {taskId}] Finished deleting images. Current delete attempts: {currentDeleteAttempts}"
            );
            await page.Locator(uploadMultipleImagesRadioSelector).ClickAsync();
            await signalRLogger($"[Task {taskId}] Clicked on upload multiple images radio button");

            List<string> validFilePaths = new List<string>();
            foreach (JToken fileToken in fileArray)
            {
                if (fileToken == null || fileToken.Type == JTokenType.Null)
                {
                    await signalRLogger(
                        $"[Task {taskId}] [Error] Encountered a null token in file JArray for multiple icons. Skipping."
                    );
                    continue;
                }
                string currentName = fileToken.ToString();
                if (string.IsNullOrEmpty(currentName))
                {
                    await signalRLogger(
                        $"[Task {taskId}] [Error] Encountered an empty filename in JArray for multiple icons. Skipping."
                    );
                    continue;
                }

                string currentPath = Path.GetFullPath(
                    Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "icons", currentName)
                );

                if (EnsureFileExists(currentPath, $"[Task {taskId}] Multiple images upload"))
                {
                    validFilePaths.Add(currentPath);
                }
                else
                {
                    await signalRLogger(
                        $"[Task {taskId}] [Error] File does not exist: {currentPath}. It will not be uploaded."
                    );
                }
            }

            if (validFilePaths.Any())
            {
                await signalRLogger(
                    $"[Task {taskId}] Attempting to upload {validFilePaths.Count} valid files..."
                );
                var multipleImagesUploadInput = page.Locator(multipleImagesUploadInputSelector);
                try
                {
                    await multipleImagesUploadInput.SetInputFilesAsync(validFilePaths);
                    await signalRLogger(
                        $"[Task {taskId}] Files selected for multiple upload: {string.Join(", ", validFilePaths)}"
                    );
                    await page.Locator(uploadMultipleImagesButtonSelector).ClickAsync();
                    await signalRLogger($"[Task {taskId}] Multiple images upload button clicked.");
                    await signalRLogger(
                        $"[Task {taskId}] Waiting for multiple images upload to complete..."
                    );

                    await page.WaitForLoadStateAsync(
                        LoadState.NetworkIdle,
                        new PageWaitForLoadStateOptions { Timeout = 30000 }
                    );
                    await signalRLogger(
                        $"[Task {taskId}] Checking for image previews after multiple upload..."
                    );
                    await page.Locator(imagePreviewSelector)
                        .First.WaitForAsync(
                            new LocatorWaitForOptions
                            {
                                State = WaitForSelectorState.Visible,
                                Timeout = 20000,
                            }
                        );
                    await signalRLogger(
                        $"[Task {taskId}] Image previews found after multiple upload, assuming upload successful."
                    );
                    return true;
                }
                catch (Exception ex)
                {
                    await signalRLogger(
                        $"[Task {taskId}] [Error] Error during upload multiple icons: {ex.Message.Split('\n')[0]}"
                    );
                    throw new Exception($"UploadMultipleIcons failed for Task {taskId}.", ex);
                }
            }
            else
            {
                await signalRLogger(
                    $"[Task {taskId}] No valid files to upload for multiple icons."
                );
                return false;
            }
        }

        public async Task UploadIconsAsync(
            int taskId,
            string productName,
            dynamic iconData,
            IPage page,
            Func<string, Task> signalRLogger
        )
        {
            JArray iconFilenames;
            await signalRLogger(
                $"[Task {taskId}] -- Entering UploadIconsAsync method for {productName} --"
            );

            if (iconData is JArray ja)
            {
                iconFilenames = ja;
            }
            else if (iconData is JObject jo && jo["Composite"] is JArray compositeArray)
            {
                iconFilenames = compositeArray;
            }
            else if (iconData is string s && !string.IsNullOrEmpty(s))
            {
                try
                {
                    iconFilenames = JArray.Parse(s);
                }
                catch (Newtonsoft.Json.JsonReaderException)
                {
                    iconFilenames = new JArray(s);
                }
            }
            else if (iconData is JValue jv && jv.Type == JTokenType.String)
            {
                iconFilenames = new JArray(jv.ToString());
            }
            else if (iconData is null)
            {
                await signalRLogger(
                    $"[Task {taskId}] Icon data is null for {productName}. Skipping upload."
                );
                return;
            }
            else
            {
                var typeName = iconData?.GetType().FullName ?? "null";
                await signalRLogger(
                    $"[Task {taskId}] [Error] Icon data is of an unexpected type '{typeName}' for {productName}. Expected JArray, JObject with 'Composite' property, or string of icon filenames."
                );
                if (iconData == null)
                    throw new ArgumentNullException(
                        nameof(iconData),
                        $"Icon data cannot be null for Task {taskId}, Product {productName}."
                    );
                throw new ArgumentException(
                    $"Icon data must be a JArray, JObject with 'Composite' property, or a string of icon filenames. Received: {typeName} for Task {taskId}, Product {productName}",
                    nameof(iconData)
                );
            }

            if (iconFilenames.Count == 0)
            {
                await signalRLogger(
                    $"[Task {taskId}] No icon filenames provided for {productName} after processing input. Skipping upload."
                );
                return;
            }

            string detailsTabSelector = "#TabDetails";
            string infoTabSelector = "#TabInfo";

            try
            {
                await signalRLogger(
                    $"[Task {taskId}] Processing: {iconFilenames.Count} icon(s) for {productName}: {iconFilenames.ToString(Newtonsoft.Json.Formatting.None)}"
                );
                await UploadFirstIcon(taskId, iconFilenames, page, signalRLogger);

                if (iconFilenames.Count > 1)
                {
                    await signalRLogger(
                        $"[Task {taskId}] Uploading {iconFilenames.Count} icons to multiple images section for {productName}..."
                    );

                    await page.Locator(detailsTabSelector).ClickAsync();
                    await signalRLogger(
                        $"[Task {taskId}] Clicked on Details tab for {productName}."
                    );
                    bool multipleUploadSuccess = await UploadMultipleIcons(
                        taskId,
                        iconFilenames,
                        page,
                        signalRLogger
                    );

                    if (multipleUploadSuccess)
                    {
                        await signalRLogger(
                            $"[Task {taskId}] Multiple icons part handled successfully for {productName}."
                        );
                    }
                    else
                    {
                        await signalRLogger(
                            $"[Task {taskId}] [Error] Multiple icons part failed for {productName}."
                        );
                        throw new Exception(
                            $"Multiple icons upload failed for Task {taskId}, Product {productName}."
                        );
                    }
                    await signalRLogger(
                        $"[Task {taskId}] Switching to Info tab for {productName}..."
                    );
                    await page.Locator(infoTabSelector).ClickAsync();
                    await signalRLogger($"[Task {taskId}] Clicked on Info tab for {productName}.");
                }
                else
                {
                    await signalRLogger(
                        $"[Task {taskId}] Single icon processed for {productName}. No additional icons for multiple upload section."
                    );
                }
                await signalRLogger(
                    $"[Task {taskId}] Icon upload process completed for {productName}."
                );
            }
            catch (Exception ex)
            {
                await signalRLogger(
                    $"[Task {taskId}] [Error] Error processing icon(s) for product {productName}: {ex.Message.Split('\n')[0]}"
                );
                throw;
            }
            finally
            {
                await signalRLogger(
                    $"[Task {taskId}] UploadIconsAsync method completed for {productName}. Cleaning up..."
                );
            }
        }
    }
}
