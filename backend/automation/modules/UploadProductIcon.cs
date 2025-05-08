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
                    Console.WriteLine($"Icon src '{iconSrc}' is not the blank placeholder.");
                    return true;
                }
                else if (iconSrc == blankImagePlaceholderOnPage)
                {
                    Console.WriteLine($"Icon src '{iconSrc}' is the blank placeholder.");
                    return false;
                }
                else
                {
                    Console.WriteLine($"Icon src '{iconSrc}' is empty or invalid for comparison.");
                    return false;
                }
            }
            catch (PlaywrightException ex)
            {
                Console.WriteLine(
                    $"Could not evaluate blank image selector or provided icon src for validation. Assuming not blank. Details: {ex.Message}"
                );
                return true;
            }
        }

        public bool EnsureFileExists(string filePath, string contextMessage)
        {
            if (System.IO.File.Exists(filePath))
            {
                Console.WriteLine($"{contextMessage}: File exists at {filePath}");
                return true;
            }
            else
            {
                Console.WriteLine($"{contextMessage}: File does not exist at {filePath}");
                return false;
            }
        }

        public async Task UploadFirstIcon(JArray fileArray, IPage page)
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
                throw new Exception("First icon filename token in JArray is null!");
            }
            string firstIconName = firstIconToken.ToString();
            if (string.IsNullOrEmpty(firstIconName))
            {
                throw new Exception("First icon filename is empty!");
            }

            string firstIconPath = Path.GetFullPath(
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "icons", firstIconName)
            );

            if (!EnsureFileExists(firstIconPath, "First icon path"))
            {
                throw new System.IO.FileNotFoundException(
                    $"First icon file not found at: {firstIconPath}"
                );
            }

            Console.WriteLine($"Uploading first icon: {firstIconPath}");
            await page.Locator(editMainIconButtonSelector).ClickAsync();
            await page.Locator(uploadMainIconRadioSelector).ClickAsync();
            await page.Locator(mainIconUploadInputSelector).SetInputFilesAsync(firstIconPath);
            await page.Locator(useSameImageIconCheckboxSelector).ClickAsync();
            await page.Locator(uploadMainIconButtonSelector).ClickAsync();
            Console.WriteLine($"Main icon uploaded successfully with {firstIconPath}");
        }

        public async Task<bool> UploadMultipleIcons(JArray fileArray, IPage page)
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
                        Console.WriteLine(
                            $"Found {imageCount} existing images. Attempting to delete..."
                        );
                    }
                }
                catch (PlaywrightException)
                {
                    Console.WriteLine(
                        $"Image preview selector {imagePreviewSelector} not found or evaluation failed. Assuming no images to delete."
                    );
                    imageCount = 0;
                }

                if (imageCount == 0)
                {
                    Console.WriteLine("No more visible images to delete.");
                    break;
                }

                try
                {
                    Console.WriteLine(
                        $"Attempting to click delete button. Attempt #{currentDeleteAttempts + 1}"
                    );

                    await page.Locator(persistentDeleteButtonSelector)
                        .ClickAsync(new LocatorClickOptions { Timeout = 5000 });
                    Console.WriteLine("Delete button clicked.");
                    await page.WaitForLoadStateAsync(
                        LoadState.NetworkIdle,
                        new PageWaitForLoadStateOptions { Timeout = 5000 }
                    );
                }
                catch (Exception ex)
                {
                    Console.WriteLine(
                        $"Error clicking delete button or waiting after delete. Attempt #{currentDeleteAttempts + 1}: {ex.Message}"
                    );

                    break;
                }
                currentDeleteAttempts++;
            }

            if (currentDeleteAttempts >= maxDeleteAttempts)
            {
                Console.WriteLine(
                    $"Max delete attempts reached ({maxDeleteAttempts}). Stopping deletion process."
                );
            }

            Console.WriteLine(
                $"Finished deleting images. Current delete attempts: {currentDeleteAttempts}"
            );
            await page.Locator(uploadMultipleImagesRadioSelector).ClickAsync();
            Console.WriteLine("Clicked on upload multiple images radio button");

            List<string> validFilePaths = new List<string>();
            foreach (JToken fileToken in fileArray)
            {
                if (fileToken == null || fileToken.Type == JTokenType.Null)
                {
                    Console.WriteLine(
                        "Encountered a null token in file JArray for multiple icons. Skipping."
                    );
                    continue;
                }
                string currentName = fileToken.ToString();
                if (string.IsNullOrEmpty(currentName))
                {
                    Console.WriteLine(
                        "Encountered an empty filename in JArray for multiple icons. Skipping."
                    );
                    continue;
                }

                string currentPath = Path.GetFullPath(
                    Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "icons", currentName)
                );

                if (EnsureFileExists(currentPath, "Multiple images upload"))
                {
                    validFilePaths.Add(currentPath);
                }
                else
                {
                    Console.WriteLine(
                        $"File does not exist: {currentPath}. It will not be uploaded."
                    );
                }
            }

            if (validFilePaths.Any())
            {
                Console.WriteLine($"Attempting to upload {validFilePaths.Count} valid files...");
                var multipleImagesUploadInput = page.Locator(multipleImagesUploadInputSelector);
                try
                {
                    await multipleImagesUploadInput.SetInputFilesAsync(validFilePaths);
                    Console.WriteLine($"Files selected: {string.Join(", ", validFilePaths)}");
                    await page.Locator(uploadMultipleImagesButtonSelector).ClickAsync();
                    Console.WriteLine("Upload button clicked.");
                    Console.WriteLine("Waiting for upload to complete...");

                    await page.WaitForLoadStateAsync(
                        LoadState.NetworkIdle,
                        new PageWaitForLoadStateOptions { Timeout = 30000 }
                    );
                    Console.WriteLine(
                        $"Checking for image previews using selector: {imagePreviewSelector}"
                    );
                    await page.Locator(imagePreviewSelector)
                        .First.WaitForAsync(
                            new LocatorWaitForOptions
                            {
                                State = WaitForSelectorState.Visible,
                                Timeout = 20000,
                            }
                        );
                    Console.WriteLine(
                        "Image previews found after upload, assuming upload successful."
                    );
                    return true;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error during upload multiple icons: {ex.Message}");

                    throw new Exception("UploadMultipleIcons failed.", ex);
                }
            }
            else
            {
                Console.WriteLine("No valid files to upload for multiple icons.");
                return false;
            }
        }

        public async Task UploadIconsAsync(dynamic iconData, IPage page)
        {
            JArray iconFilenames;

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
                iconFilenames = new JArray(s);
            }
            else if (iconData is JValue jv && jv.Type == JTokenType.String)
            {
                iconFilenames = new JArray(jv.ToString());
            }
            else
            {
                var typeName = iconData?.GetType().FullName ?? "null";
                Console.WriteLine(
                    $"Error: Icon data is of an unexpected type '{typeName}'. Expected JArray, JObject with 'Composite' property, or string of icon filenames."
                );
                if (iconData == null)
                    throw new ArgumentNullException(nameof(iconData), "Icon data cannot be null.");
                throw new ArgumentException(
                    $"Icon data must be a JArray, JObject with 'Composite' property, or a string of icon filenames. Received: {typeName}",
                    nameof(iconData)
                );
            }

            if (iconFilenames.Count == 0)
            {
                Console.WriteLine(
                    "No icon filenames provided after processing input. Skipping upload."
                );
                return;
            }

            string detailsTabSelector = "#TabDetails";
            string infoTabSelector = "#TabInfo";

            try
            {
                Console.WriteLine(
                    $"Processing: {iconFilenames.Count} icon(s): {iconFilenames.ToString(Newtonsoft.Json.Formatting.None)}"
                );
                await UploadFirstIcon(iconFilenames, page);

                if (iconFilenames.Count > 1)
                {
                    Console.WriteLine(
                        $"Uploading {iconFilenames.Count} icons to multiple images section (includes re-uploading first if UI requires)..."
                    );

                    await page.Locator(detailsTabSelector).ClickAsync();
                    Console.WriteLine("Clicked on Details tab");
                    bool multipleUploadSuccess = await UploadMultipleIcons(iconFilenames, page);

                    if (multipleUploadSuccess)
                    {
                        Console.WriteLine("Multiple icons part handled successfully.");
                    }
                    else
                    {
                        Console.WriteLine("Multiple icons part failed.");

                        throw new Exception("Multiple icons upload failed.");
                    }
                    Console.WriteLine("Switching to Info tab...");
                    await page.Locator(infoTabSelector).ClickAsync();
                    Console.WriteLine("Clicked on Info tab");
                }
                else
                {
                    Console.WriteLine(
                        "Single icon processed by UploadFirstIcon. No additional icons for multiple upload section."
                    );
                }
                Console.WriteLine("Icon upload process completed for this product.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing icon(s) for product: {ex.Message}");
                throw;
            }
        }
    }
}
