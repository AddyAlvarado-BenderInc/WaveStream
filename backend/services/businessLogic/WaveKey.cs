using System.Collections;
using System.Collections.Concurrent;
using System.Globalization;
using System.Threading;
using backend.Hubs;
using CsvHelper;
using CsvHelper.Configuration;
using DotNetEnv;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Microsoft.Playwright;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

public class Wavekey
{
    private readonly string baseDirectory;
    private readonly string iconsDir;
    private readonly string pdfsDir;
    private readonly string uploadsDir;
    private readonly ILogger<Wavekey> logger;
    private readonly IHubContext<LogHub> _logHubContext;
    private static readonly HttpClient httpClient = new HttpClient();
    private static ILogger _staticLogger = null!;
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _fileDownloadLocks =
        new ConcurrentDictionary<string, SemaphoreSlim>();

    private IBrowser? browser;
    private IPlaywright? playwright;
    private CancellationTokenSource? _automationCts;

    public Wavekey(ILogger<Wavekey> logger, IHubContext<LogHub> logHubContext)
    {
        this.logger = logger;
        _staticLogger = logger;
        this._logHubContext = logHubContext;
        baseDirectory = AppDomain.CurrentDomain.BaseDirectory;
        iconsDir = Path.Combine(baseDirectory, "icons");
        pdfsDir = Path.Combine(baseDirectory, "pdfs");
        uploadsDir = Path.Combine(baseDirectory, "uploads");

        Directory.CreateDirectory(iconsDir);
        Directory.CreateDirectory(pdfsDir);
        Directory.CreateDirectory(uploadsDir);
    }

    private async Task AutoDeleteOldFilesAsync(string directory)
    {
        if (!Directory.Exists(directory))
            return;

        foreach (var file in Directory.EnumerateFiles(directory))
        {
            try
            {
                logger.LogInformation(
                    "Deleting file: {FileName} from {DirectoryName}",
                    (string)Path.GetFileName(file),
                    (string)Path.GetFileName(directory) ?? "UnknownDir"
                );

                await Task.Run(() => File.Delete(file));
            }
            catch (IOException ex)
            {
                logger.LogWarning(
                    ex,
                    "IO Error deleting file {FilePath}. File might be in use.",
                    (string)file
                );
            }
            catch (UnauthorizedAccessException ex)
            {
                logger.LogWarning(ex, "Permission Error deleting file {FilePath}.", (string)file);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Unexpected Error deleting file {FilePath}", (string)file);
            }
        }
    }

    public Task AutoDeleteOldUploadsAsync() => AutoDeleteOldFilesAsync(uploadsDir);

    public Task AutoDeleteOldPdfsAsync() => AutoDeleteOldFilesAsync(pdfsDir);

    public Task AutoDeleteOldIconsAsync() => AutoDeleteOldFilesAsync(iconsDir);

    public static async Task DownloadFileAsync(string url, string filePath)
    {
        ArgumentNullException.ThrowIfNull(_staticLogger, nameof(_staticLogger));

        SemaphoreSlim fileLock = _fileDownloadLocks.GetOrAdd(
            filePath,
            k => new SemaphoreSlim(1, 1)
        );

        await fileLock.WaitAsync();
        try
        {
            if (File.Exists(filePath) && new FileInfo(filePath).Length > 0)
            {
                _staticLogger.LogInformation(
                    "File {FilePath} already exists and is non-empty. Skipping download from {Url}.",
                    filePath,
                    url
                );
                return;
            }

            string tempFilePath = filePath + ".tmp" + Guid.NewGuid().ToString("N");

            try
            {
                _staticLogger.LogInformation(
                    "Attempting to download {Url} to {FilePath} via temp file {TempFilePath}",
                    url,
                    filePath,
                    tempFilePath
                );
                using HttpResponseMessage response = await httpClient.GetAsync(
                    url,
                    HttpCompletionOption.ResponseHeadersRead
                );

                if (!response.IsSuccessStatusCode)
                {
                    _staticLogger.LogError(
                        "Failed to download file from {Url}. Status: {StatusCode}",
                        url,
                        response.StatusCode
                    );
                    return;
                }

                string? directoryPath = Path.GetDirectoryName(filePath);
                if (!string.IsNullOrEmpty(directoryPath))
                {
                    Directory.CreateDirectory(directoryPath);
                }
                else
                {
                    _staticLogger.LogWarning(
                        "Could not determine directory for {FilePath}",
                        filePath
                    );
                    return;
                }

                if (File.Exists(tempFilePath))
                {
                    File.Delete(tempFilePath);
                }

                using (Stream contentStream = await response.Content.ReadAsStreamAsync())
                using (
                    FileStream fileStream = new FileStream(
                        tempFilePath,
                        FileMode.Create,
                        FileAccess.Write,
                        FileShare.None,
                        bufferSize: 8192,
                        useAsync: true
                    )
                )
                {
                    await contentStream.CopyToAsync(fileStream);
                    await fileStream.FlushAsync();
                }

                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                }
                File.Move(tempFilePath, filePath);

                _staticLogger.LogInformation(
                    "Successfully downloaded {Url} to {FilePath}",
                    url,
                    filePath
                );
            }
            catch (HttpRequestException ex)
            {
                _staticLogger.LogError(
                    ex,
                    "HTTP request error downloading file {Url} to {TempFilePath}",
                    url,
                    tempFilePath
                );
                if (File.Exists(tempFilePath))
                    try
                    {
                        File.Delete(tempFilePath);
                    }
                    catch (Exception iex)
                    {
                        _staticLogger.LogWarning(
                            iex,
                            "Failed to delete temp file {TempFilePath} on HTTP error.",
                            tempFilePath
                        );
                    }
            }
            catch (IOException ex)
            {
                _staticLogger.LogError(
                    ex,
                    "IO Error during download/move operation for {Url} to {FilePath} (using temp {TempFilePath})",
                    url,
                    filePath,
                    tempFilePath
                );
                if (File.Exists(tempFilePath))
                    try
                    {
                        File.Delete(tempFilePath);
                    }
                    catch (Exception iex)
                    {
                        _staticLogger.LogWarning(
                            iex,
                            "Failed to delete temp file {TempFilePath} on IO error.",
                            tempFilePath
                        );
                    }
            }
            catch (ArgumentException ex)
            {
                _staticLogger.LogError(
                    ex,
                    "Argument error during file download for {Url} to {FilePath} (using temp {TempFilePath})",
                    url,
                    filePath,
                    tempFilePath
                );
                if (File.Exists(tempFilePath))
                    try
                    {
                        File.Delete(tempFilePath);
                    }
                    catch (Exception iex)
                    {
                        _staticLogger.LogWarning(
                            iex,
                            "Failed to delete temp file {TempFilePath} on Argument error.",
                            tempFilePath
                        );
                    }
            }
            catch (Exception ex)
            {
                _staticLogger.LogError(
                    ex,
                    "Unexpected error downloading file {Url} to {FilePath} (using temp {TempFilePath})",
                    url,
                    filePath,
                    tempFilePath
                );
                if (File.Exists(tempFilePath))
                    try
                    {
                        File.Delete(tempFilePath);
                    }
                    catch (Exception iex)
                    {
                        _staticLogger.LogWarning(
                            iex,
                            "Failed to delete temp file {TempFilePath} on unexpected error.",
                            tempFilePath
                        );
                    }
            }
        }
        finally
        {
            fileLock.Release();
        }
    }

    public static JToken? RemoveEmptyValues(object? obj)
    {
        if (obj is JArray array)
        {
            var newList = new JArray();
            foreach (var item in array)
            {
                var cleanedItem = RemoveEmptyValues(item);
                if (cleanedItem is JToken jtItem && jtItem.Type != JTokenType.Null)
                {
                    newList.Add(jtItem);
                }
            }
            return newList.HasValues ? newList : null;
        }
        else if (obj is JObject jobj)
        {
            var newObj = new JObject();
            foreach (var property in jobj.Properties())
            {
                var cleanedValue = RemoveEmptyValues(property.Value);
                if (cleanedValue is JToken jtValue && jtValue.Type != JTokenType.Null)
                {
                    newObj.Add(property.Name, jtValue);
                }
            }
            return newObj.HasValues ? newObj : null;
        }
        else if (obj is JValue jv && (jv.Value == null || string.IsNullOrEmpty(jv.ToString())))
        {
            return null;
        }
        else if (obj is string str && string.IsNullOrEmpty(str))
        {
            return null;
        }
        else if (obj is IList list && list.Count == 0)
        {
            return null;
        }
        else if (obj is IDictionary dict && dict.Count == 0)
        {
            return null;
        }
        else if (obj == null)
        {
            return null;
        }

        if (obj is not JToken)
        {
            try
            {
                return JToken.FromObject(obj);
            }
            catch (Exception ex)
            {
                _staticLogger?.LogError(
                    ex,
                    "Failed to convert object of type {ObjectType} to JToken in RemoveEmptyValues",
                    obj.GetType().Name
                );
                return null;
            }
        }

        return obj as JToken;
    }

    public async Task<List<dynamic>> ProcessRequestAsync(
        string type,
        string? runOption,
        string? cellOriginJson,
        string? jsonData,
        string? threadCount,
        IFormFile? uploadedFile
    )
    {
        string? csvFilePath = null;
        if (uploadedFile != null)
        {
            csvFilePath = Path.Combine(uploadsDir, $"{Guid.NewGuid()}_{uploadedFile.FileName}");
            // logger.LogInformation("Saving uploaded file to {FilePath}", (string)csvFilePath);
            try
            {
                await using (var stream = new FileStream(csvFilePath, FileMode.Create))
                {
                    await uploadedFile.CopyToAsync(stream);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(
                    ex,
                    "Failed to save uploaded file {FileName}",
                    uploadedFile.FileName
                );
                throw new IOException($"Failed to save uploaded file: {uploadedFile.FileName}", ex);
            }
        }

        var fileDataSource = new { JsonData = jsonData, CsvFilePath = csvFilePath };

        var products = await DifferentiateProductDataAsync(type, fileDataSource);

        try
        {
            if (!string.IsNullOrEmpty(cellOriginJson))
            {
                var cellOriginData = JToken.Parse(cellOriginJson);
                logger.LogInformation("Cell Origin Data: {@CellOriginData}", cellOriginData);
            }
        }
        catch (JsonReaderException ex)
        {
            logger.LogWarning(ex, "Failed to parse cellOrigin JSON: {Json}", cellOriginJson);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Error processing cellOrigin JSON: {Json}", cellOriginJson);
        }

        if (products != null && products.Any())
        {
            await ExecuteAutomationAsync(products, runOption, threadCount);
        }
        else
        {
            logger.LogWarning("Skipping automation execution as no products were processed.");
        }

        if (!string.IsNullOrEmpty(csvFilePath) && File.Exists(csvFilePath))
        {
            try
            {
                File.Delete(csvFilePath);
                logger.LogInformation("Cleaned up temporary upload file: {FilePath}", csvFilePath);
            }
            catch (Exception ex)
            {
                logger.LogWarning(
                    ex,
                    "Failed to clean up temporary upload file: {FilePath}",
                    csvFilePath
                );
            }
        }

        return products ?? new List<dynamic>();
    }

    private async Task<List<dynamic>> DifferentiateProductDataAsync(
        string type,
        dynamic fileDataSource
    )
    {
        List<dynamic> products = new List<dynamic>();
        List<JObject>? productJObjects = null;

        if (type == "json-type" && !string.IsNullOrEmpty(fileDataSource.JsonData))
        {
            logger.LogInformation("Processing JSON data...");
            try
            {
                productJObjects = JsonConvert.DeserializeObject<List<JObject>>(
                    fileDataSource.JsonData
                );
                if (productJObjects == null)
                    return products;

                await ProcessProductDownloadsAsync(productJObjects);

                var cleanedResult = RemoveEmptyValues(new JArray(productJObjects));
                products =
                    (cleanedResult as JArray)?.ToObject<List<dynamic>>() ?? new List<dynamic>();
            }
            catch (JsonReaderException ex)
            {
                logger.LogError(ex, "JSON Parsing Error");
                throw;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing JSON data");
                throw new Exception("Error during JSON data processing.", ex);
            }
        }
        else if (type == "csv-type" && !string.IsNullOrEmpty(fileDataSource.CsvFilePath))
        {
            logger.LogInformation(
                "Processing CSV file: {FilePath}",
                (string)fileDataSource.CsvFilePath
            );
            try
            {
                var config = new CsvConfiguration(CultureInfo.InvariantCulture)
                {
                    HasHeaderRecord = true,
                    MissingFieldFound = null,
                    BadDataFound = null,
                    IgnoreBlankLines = true,
                    TrimOptions = TrimOptions.Trim,
                    Delimiter = ",",
                    Encoding = System.Text.Encoding.UTF8,
                };
                using (var reader = new StreamReader(fileDataSource.CsvFilePath))
                using (var csv = new CsvReader(reader, config))
                {
                    products = csv.GetRecords<dynamic>().ToList();
                }

                await ProcessProductDownloadsAsync(products);

                var cleanedObject = RemoveEmptyValues(products);

                if (cleanedObject is JArray cleanedJArray)
                {
                    products = cleanedJArray.ToObject<List<dynamic>>() ?? new List<dynamic>();
                }
                else
                {
                    products = new List<dynamic>();
                    logger.LogWarning("Data cleaning for CSV resulted in unexpected type or null.");
                }
            }
            catch (IOException ex)
            {
                logger.LogError(
                    ex,
                    "IO Error reading CSV file {FilePath}",
                    (string)fileDataSource.CsvFilePath
                );
                throw new Exception("Error reading the uploaded CSV file.", ex);
            }
            catch (CsvHelperException ex)
            {
                logger.LogError(
                    ex,
                    "CSV Parsing Error in file {FilePath}",
                    (string)fileDataSource.CsvFilePath
                );
                throw new Exception("Error parsing the CSV file content.", ex);
            }
            catch (Exception ex)
            {
                logger.LogError(
                    ex,
                    "Error processing CSV file {FilePath}",
                    (string)fileDataSource.CsvFilePath
                );
                throw new Exception("Error during CSV data processing.", ex);
            }
        }
        else
        {
            logger.LogWarning("Unsupported type '{Type}' or missing data.", (string)type);
        }

        return products;
    }

    private async Task ProcessProductDownloadsAsync(List<JObject> products)
    {
        var allDownloadTasks = new List<Task>();
        foreach (var p in products)
        {
            var iconContent =
                p != null
                && p["Icon"] is JObject iconObj
                && iconObj["Package"] is JObject packageObj
                && packageObj["content"] is JObject contentObj
                    ? contentObj
                    : null;
            if (iconContent != null)
            {
                var iconFilenames = (iconContent["filename"] as JArray)?.ToObject<List<string>>();
                var iconUrls = (iconContent["url"] as JArray)?.ToObject<List<string>>();

                if (
                    iconFilenames != null
                    && iconUrls != null
                    && iconFilenames.Count == iconUrls.Count
                    && iconFilenames.Any()
                )
                {
                    logger.LogInformation(
                        "Processing Icons for Product: {ProductName}",
                        (string?)p?["ItemName"] ?? "Unknown"
                    );
                    for (int i = 0; i < iconUrls.Count; i++)
                    {
                        if (iconUrls[i] != null)
                        {
                            allDownloadTasks.Add(
                                DownloadFileAsync(
                                    iconUrls[i],
                                    Path.Combine(iconsDir, iconFilenames[i])
                                )
                            );
                        }
                        else
                        {
                            logger.LogWarning(
                                "Icon URL is null for {ProductName}",
                                (string?)p?["ItemName"] ?? "Unknown"
                            );
                        }
                    }
                    allDownloadTasks.Add(
                        Task.Run(() =>
                        {
                            try
                            {
                                if (p != null)
                                {
                                    p["Icon"] = JToken.FromObject(
                                        new { Composite = iconFilenames }
                                    );
                                }
                            }
                            catch (Exception ex)
                            {
                                logger.LogWarning(
                                    ex,
                                    "Failed to transform Icon field for {ProductName}",
                                    (string?)p?["ItemName"] ?? "Unknown"
                                );
                            }
                        })
                    );
                }

                var pdfContent =
                    p != null
                    && p["PDFUploadName"] is JObject pdfObj
                    && pdfObj["Package"] is JObject pdfPackageObj
                    && pdfPackageObj["content"] is JObject pdfContentObj
                        ? pdfContentObj
                        : null;

                if (pdfContent != null)
                    if (pdfContent != null)
                    {
                        var pdfFilenames = (pdfContent["filename"] as JArray)?.ToObject<
                            List<string>
                        >();
                        var pdfUrls = (pdfContent["url"] as JArray)?.ToObject<List<string>>();
                        if (
                            pdfFilenames != null
                            && pdfUrls != null
                            && pdfFilenames.Count == pdfUrls.Count
                            && pdfFilenames.Any()
                        )
                        {
                            logger.LogInformation(
                                "Processing PDFs for Product: {ProductName}",
                                (string?)p?["ItemName"] ?? "Unknown"
                            );
                            for (int i = 0; i < pdfUrls.Count; i++)
                            {
                                allDownloadTasks.Add(
                                    DownloadFileAsync(
                                        pdfUrls[i],
                                        Path.Combine(pdfsDir, pdfFilenames[i])
                                    )
                                );
                            }
                            allDownloadTasks.Add(
                                Task.Run(() =>
                                {
                                    try
                                    {
                                        if (p != null)
                                        {
                                            p["PDFUploadName"] = JToken.FromObject(
                                                new { Composite = pdfFilenames }
                                            );
                                        }
                                    }
                                    catch (Exception ex)
                                    {
                                        logger.LogWarning(
                                            ex,
                                            "Failed to transform PDFUploadName field for {ProductName}",
                                            (string?)p?["ItemName"] ?? "Unknown"
                                        );
                                    }
                                })
                            );
                        }
                    }
            }
            try
            {
                await Task.WhenAll(allDownloadTasks);
                logger.LogInformation(
                    "All file downloads/transformations completed for JSON data."
                );
            }
            catch (Exception ex)
            {
                logger.LogError(
                    ex,
                    "One or more download/transformation tasks failed for JSON data."
                );
                throw new Exception(
                    "Failed during file download/transformation phase for JSON.",
                    ex
                );
            }
        }
    }

    private async Task ProcessProductDownloadsAsync(List<dynamic> products)
    {
        var allDownloadTasks = new List<Task>();
        foreach (var product in products)
        {
            try
            {
                var iconContent =
                    product.Icon is JObject iconObj
                    && iconObj["Package"] is JObject packageObj
                    && packageObj["content"] is JObject contentObj
                        ? contentObj
                        : null;

                if (iconContent != null)
                {
                    var iconFilenames = (iconContent["filename"] as JArray)?.ToObject<
                        List<string>
                    >();
                    var iconUrls = (iconContent["url"] as JArray)?.ToObject<List<string>>();

                    if (
                        iconFilenames != null
                        && iconUrls != null
                        && iconFilenames.Count == iconUrls.Count
                    )
                    {
                        logger.LogInformation(
                            "Processing Icons for Product: {ProductName}",
                            (string?)product.ItemName ?? "Unknown"
                        );

                        for (int i = 0; i < iconUrls.Count; i++)
                        {
                            if (!string.IsNullOrEmpty(iconUrls[i]))
                            {
                                allDownloadTasks.Add(
                                    DownloadFileAsync(
                                        iconUrls[i],
                                        Path.Combine(iconsDir, iconFilenames[i])
                                    )
                                );
                            }
                        }
                    }
                }

                var pdfContent =
                    product.PDFUploadName is JObject pdfObj
                    && pdfObj["Package"] is JObject pdfPackageObj
                    && pdfPackageObj["content"] is JObject pdfContentObj
                        ? pdfContentObj
                        : null;

                if (pdfContent != null)
                {
                    var pdfFilenames = (pdfContent["filename"] as JArray)?.ToObject<List<string>>();
                    var pdfUrls = (pdfContent["url"] as JArray)?.ToObject<List<string>>();

                    if (
                        pdfFilenames != null
                        && pdfUrls != null
                        && pdfFilenames.Count == pdfUrls.Count
                    )
                    {
                        logger.LogInformation(
                            "Processing PDFs for Product: {ProductName}",
                            (string?)product.ItemName ?? "Unknown"
                        );

                        for (int i = 0; i < pdfUrls.Count; i++)
                        {
                            if (!string.IsNullOrEmpty(pdfUrls[i]))
                            {
                                allDownloadTasks.Add(
                                    DownloadFileAsync(
                                        pdfUrls[i],
                                        Path.Combine(pdfsDir, pdfFilenames[i])
                                    )
                                );
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Error processing downloads/transformations for a product.");
            }
        }
        try
        {
            await Task.WhenAll(allDownloadTasks);
            logger.LogInformation("All file downloads/transformations completed for dynamic data.");
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "One or more download/transformation tasks failed for dynamic data."
            );
            throw new Exception(
                "Failed during file download/transformation phase for dynamic data.",
                ex
            );
        }
    }

    private async Task ExecuteAutomationAsync(
        List<dynamic> products,
        string? runOption,
        string? threadCount
    )
    {
        var logMessage =
            $"Executing automation for {products.Count} products with RunOption: {runOption ?? "N/A"}...";
        logger.LogInformation(logMessage);
        await _logHubContext.Clients.All.SendAsync("ReceiveLogEntry", $"[Wavekey] {logMessage}");

        string benderUsername = Env.GetString("BENDER_USERNAME", "DEFAULT_USERNAME");
        string benderPassword = Env.GetString("BENDER_PASSWORD", "DEFAULT_PASSWORD");
        string benderSite = Env.GetString("BENDER_ADMIN_WEBSITE", "DEFAULT_SITE");
        string DevAUsername = Env.GetString("DEVA_USERNAME", "DEFAULT_DEV_USERNAME");
        string DevAPassword = Env.GetString("DEVA_PASSWORD", "DEFAULT_DEV_PASSWORD");

        if (
            benderUsername == "DEFAULT_USERNAME"
            || benderPassword == "DEFAULT_PASSWORD"
            || benderSite == "DEFAULT_SITE"
        )
        {
            logMessage =
                "One or more environment variables (BENDER_USERNAME, BENDER_PASSWORD, BENDER_ADMIN_WEBSITE) not found or using defaults.";
            logger.LogWarning(logMessage);
            await _logHubContext.Clients.All.SendAsync(
                "ReceiveLogEntry",
                $"[Wavekey WARNING] {logMessage}"
            );
        }

        IPage? initialPage = null;
        IBrowserContext? mainContext = null;

        _automationCts?.Dispose();
        _automationCts = new CancellationTokenSource();
        var cancellationToken = _automationCts.Token;

        try
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (playwright == null)
            {
                logMessage = "Initializing Playwright...";
                logger.LogInformation(logMessage);
                await _logHubContext.Clients.All.SendAsync(
                    "ReceiveLogEntry",
                    $"[Wavekey] {logMessage}"
                );
                playwright = await Playwright.CreateAsync();
            }
            cancellationToken.ThrowIfCancellationRequested();
            if (browser == null || !browser.IsConnected)
            {
                logMessage = "Launching browser...";
                logger.LogInformation(logMessage);
                await _logHubContext.Clients.All.SendAsync(
                    "ReceiveLogEntry",
                    $"[Wavekey] {logMessage}"
                );
                // Based on admin permissions, the user can either switch between headless or non-headless mode for the environment
                var launchOptions = new BrowserTypeLaunchOptions { Headless = false };
                browser = await playwright.Chromium.LaunchAsync(launchOptions);
            }

            cancellationToken.ThrowIfCancellationRequested();
            logMessage = "Creating new browser context...";
            logger.LogInformation(logMessage);
            await _logHubContext.Clients.All.SendAsync(
                "ReceiveLogEntry",
                $"[Wavekey] {logMessage}"
            );
            mainContext = await browser.NewContextAsync(new BrowserNewContextOptions());
            initialPage = await mainContext.NewPageAsync();

            logMessage = $"Navigating to login page: {benderSite}";
            logger.LogInformation(logMessage);
            await _logHubContext.Clients.All.SendAsync(
                "ReceiveLogEntry",
                $"[Wavekey] {logMessage}"
            );
            await initialPage.GotoAsync(
                benderSite,
                new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle, Timeout = 60000 }
            );

            cancellationToken.ThrowIfCancellationRequested();
            logMessage = "Attempting to fill login form...";
            logger.LogInformation(logMessage);
            await _logHubContext.Clients.All.SendAsync(
                "ReceiveLogEntry",
                $"[Wavekey] {logMessage}"
            );
            await initialPage.FillAsync(
                "input[ng-model=\"data.UserName\"]",
                benderUsername,
                new PageFillOptions { Timeout = 30000 }
            );
            await initialPage.FillAsync(
                "#loginPwd",
                benderPassword,
                new PageFillOptions { Timeout = 30000 }
            );
            logMessage = "Clicking login button...";
            logger.LogInformation(logMessage);
            await _logHubContext.Clients.All.SendAsync(
                "ReceiveLogEntry",
                $"[Wavekey] {logMessage}"
            );
            await initialPage.ClickAsync(".login-button", new PageClickOptions { Timeout = 30000 });

            await initialPage.WaitForNavigationAsync(
                new PageWaitForNavigationOptions
                {
                    WaitUntil = WaitUntilState.NetworkIdle,
                    Timeout = 60000,
                }
            );

            if (initialPage.Url.Contains("Login", StringComparison.OrdinalIgnoreCase))
            {
                logMessage = $"Login failed. Current URL: {initialPage.Url}";
                logger.LogError(logMessage);
                await _logHubContext.Clients.All.SendAsync(
                    "ReceiveLogEntry",
                    $"[Wavekey ERROR] {logMessage}"
                );
                throw new Exception("Login failed. Please check credentials or site status.");
            }
            logMessage = $"Logged in successfully! Current URL: {initialPage.Url}";
            logger.LogInformation(logMessage);
            await _logHubContext.Clients.All.SendAsync(
                "ReceiveLogEntry",
                $"[Wavekey] {logMessage}"
            );
            cancellationToken.ThrowIfCancellationRequested();

            runAuto automation = new runAuto();
            Func<string, Task> signalRLogger = async (msg) =>
                await _logHubContext.Clients.All.SendAsync("ReceiveLogEntry", msg);

            if (!string.IsNullOrEmpty(threadCount) && products.Any())
            {
                await automation.RunAutomation(
                    products,
                    initialPage,
                    browser,
                    threadCount,
                    cancellationToken,
                    signalRLogger
                );
            }
            else if (!products.Any())
            {
                logMessage = "No products to process. Skipping RunAutomation call.";
                logger.LogInformation(logMessage);
                await _logHubContext.Clients.All.SendAsync(
                    "ReceiveLogEntry",
                    $"[Wavekey] {logMessage}"
                );
            }

            if (!cancellationToken.IsCancellationRequested)
            {
                logMessage = "Automation completed successfully.";
                logger.LogInformation(logMessage);
                await _logHubContext.Clients.All.SendAsync(
                    "ReceiveLogEntry",
                    $"[Wavekey] {logMessage}"
                );
            }
            else
            {
                logMessage = "Automation was cancelled during execution.";
                logger.LogInformation(logMessage);
                await _logHubContext.Clients.All.SendAsync(
                    "ReceiveLogEntry",
                    $"[Wavekey] {logMessage}"
                );
            }
        }
        catch (OperationCanceledException)
        {
            logMessage = "Automation execution was cancelled.";
            logger.LogInformation(logMessage);
            await _logHubContext.Clients.All.SendAsync(
                "ReceiveLogEntry",
                $"[Wavekey] {logMessage}"
            );
        }
        catch (TimeoutException tex)
        {
            logMessage = "Timeout during automation.";
            logger.LogError(tex, logMessage);
            await _logHubContext.Clients.All.SendAsync(
                "ReceiveLogEntry",
                $"[Wavekey ERROR] {logMessage}"
            );
        }
        catch (PlaywrightException pex)
        {
            logMessage = "Playwright error during automation.";
            logger.LogError(pex, logMessage);
            await _logHubContext.Clients.All.SendAsync(
                "ReceiveLogEntry",
                $"[Wavekey ERROR] {logMessage}"
            );
        }
        catch (Exception ex)
        {
            logMessage = "Error during automation execution.";
            logger.LogError(ex, logMessage);
            await _logHubContext.Clients.All.SendAsync(
                "ReceiveLogEntry",
                $"[Wavekey ERROR] {logMessage}"
            );
        }
        finally
        {
            logMessage = "Starting cleanup in ExecuteAutomationAsync finally block...";
            logger.LogInformation(logMessage);
            await _logHubContext.Clients.All.SendAsync(
                "ReceiveLogEntry",
                $"[Wavekey] {logMessage}"
            );

            if (initialPage != null && !initialPage.IsClosed)
            {
                try
                {
                    logMessage = "Closing initial page...";
                    logger.LogInformation(logMessage);
                    await _logHubContext.Clients.All.SendAsync(
                        "ReceiveLogEntry",
                        $"[Wavekey] {logMessage}"
                    );
                    await initialPage.CloseAsync();
                    logMessage = "Initial page closed.";
                    logger.LogInformation(logMessage);
                    await _logHubContext.Clients.All.SendAsync(
                        "ReceiveLogEntry",
                        $"[Wavekey] {logMessage}"
                    );
                }
                catch (Exception ex)
                {
                    logMessage = "Error closing initial page.";
                    logger.LogWarning(ex, logMessage);
                    await _logHubContext.Clients.All.SendAsync(
                        "ReceiveLogEntry",
                        $"[Wavekey WARNING] {logMessage}"
                    );
                }
            }
            if (mainContext != null)
            {
                try
                {
                    logMessage = "Closing main browser context...";
                    logger.LogInformation(logMessage);
                    await _logHubContext.Clients.All.SendAsync(
                        "ReceiveLogEntry",
                        $"[Wavekey] {logMessage}"
                    );
                    await mainContext.CloseAsync();
                    logMessage = "Main browser context closed.";
                    logger.LogInformation(logMessage);
                    await _logHubContext.Clients.All.SendAsync(
                        "ReceiveLogEntry",
                        $"[Wavekey] {logMessage}"
                    );
                }
                catch (Exception ex)
                {
                    logMessage = "Error closing main browser context.";
                    logger.LogWarning(ex, logMessage);
                    await _logHubContext.Clients.All.SendAsync(
                        "ReceiveLogEntry",
                        $"[Wavekey WARNING] {logMessage}"
                    );
                }
            }

            if (_automationCts != null && _automationCts.IsCancellationRequested)
            {
                logMessage =
                    "Cancellation was requested, ensuring browser and Playwright are closed.";
                logger.LogInformation(logMessage);
                await _logHubContext.Clients.All.SendAsync(
                    "ReceiveLogEntry",
                    $"[Wavekey] {logMessage}"
                );
                if (browser != null && browser.IsConnected)
                {
                    try
                    {
                        await browser.CloseAsync();
                        logMessage = "Playwright browser closed due to cancellation.";
                        logger.LogInformation(logMessage);
                        await _logHubContext.Clients.All.SendAsync(
                            "ReceiveLogEntry",
                            $"[Wavekey] {logMessage}"
                        );
                    }
                    catch (Exception ex)
                    {
                        logMessage = "Error closing browser during cancellation cleanup.";
                        logger.LogWarning(ex, logMessage);
                        await _logHubContext.Clients.All.SendAsync(
                            "ReceiveLogEntry",
                            $"[Wavekey WARNING] {logMessage}"
                        );
                    }
                    finally
                    {
                        browser = null;
                    }
                }
                if (playwright != null)
                {
                    try
                    {
                        playwright.Dispose();
                        logMessage = "Playwright instance disposed due to cancellation.";
                        logger.LogInformation(logMessage);
                        await _logHubContext.Clients.All.SendAsync(
                            "ReceiveLogEntry",
                            $"[Wavekey] {logMessage}"
                        );
                    }
                    catch (Exception ex)
                    {
                        logMessage = "Error disposing playwright during cancellation cleanup.";
                        logger.LogWarning(ex, logMessage);
                        await _logHubContext.Clients.All.SendAsync(
                            "ReceiveLogEntry",
                            $"[Wavekey WARNING] {logMessage}"
                        );
                    }
                    finally
                    {
                        playwright = null;
                    }
                }
            }

            if (_automationCts != null)
            {
                _automationCts.Dispose();
                _automationCts = null;
                logMessage = "Automation CancellationTokenSource disposed.";
                logger.LogInformation(logMessage);
                await _logHubContext.Clients.All.SendAsync(
                    "ReceiveLogEntry",
                    $"[Wavekey] {logMessage}"
                );
            }
            logMessage = "Cleanup in ExecuteAutomationAsync finally block completed.";
            logger.LogInformation(logMessage);
            await _logHubContext.Clients.All.SendAsync(
                "ReceiveLogEntry",
                $"[Wavekey] {logMessage}"
            );
        }
    }

    public async Task StopAutomationAsync()
    {
        string logMessage;
        if (_automationCts != null && !_automationCts.IsCancellationRequested)
        {
            logMessage = "Processing request to stop automation...";
            logger.LogInformation(logMessage);
            await _logHubContext.Clients.All.SendAsync(
                "ReceiveLogEntry",
                $"[Wavekey] {logMessage}"
            );
            _automationCts.Cancel();
            logMessage =
                "Cancellation requested for ongoing automation. Tasks should begin to terminate.";
            logger.LogInformation(logMessage);
            await _logHubContext.Clients.All.SendAsync(
                "ReceiveLogEntry",
                $"[Wavekey] {logMessage}"
            );
        }
        else if (_automationCts != null && _automationCts.IsCancellationRequested)
        {
            logMessage = "Automation cancellation was already requested.";
            logger.LogInformation(logMessage);
            await _logHubContext.Clients.All.SendAsync(
                "ReceiveLogEntry",
                $"[Wavekey] {logMessage}"
            );
        }
        else
        {
            logMessage =
                "No active automation to stop (CancellationTokenSource is null or already cancelled).";
            logger.LogInformation(logMessage);
            await _logHubContext.Clients.All.SendAsync(
                "ReceiveLogEntry",
                $"[Wavekey] {logMessage}"
            );
        }

        if (browser != null && browser.IsConnected)
        {
            logMessage = "Attempting to directly close browser as part of stop request...";
            logger.LogInformation(logMessage);
            await _logHubContext.Clients.All.SendAsync(
                "ReceiveLogEntry",
                $"[Wavekey] {logMessage}"
            );
            try
            {
                await browser.CloseAsync();
                browser = null;
                logMessage = "Playwright browser directly closed by StopAutomationAsync.";
                logger.LogInformation(logMessage);
                await _logHubContext.Clients.All.SendAsync(
                    "ReceiveLogEntry",
                    $"[Wavekey] {logMessage}"
                );
            }
            catch (Exception ex)
            {
                logMessage = "Error during direct browser close in StopAutomationAsync.";
                logger.LogWarning(ex, logMessage);
                await _logHubContext.Clients.All.SendAsync(
                    "ReceiveLogEntry",
                    $"[Wavekey WARNING] {logMessage}"
                );
            }
        }
        if (playwright != null)
        {
            logMessage =
                "Attempting to directly dispose Playwright instance as part of stop request...";
            logger.LogInformation(logMessage);
            await _logHubContext.Clients.All.SendAsync(
                "ReceiveLogEntry",
                $"[Wavekey] {logMessage}"
            );
            try
            {
                playwright.Dispose();
                playwright = null;
                logMessage = "Playwright instance directly disposed by StopAutomationAsync.";
                logger.LogInformation(logMessage);
                await _logHubContext.Clients.All.SendAsync(
                    "ReceiveLogEntry",
                    $"[Wavekey] {logMessage}"
                );
            }
            catch (Exception ex)
            {
                logMessage = "Error during direct playwright disposal in StopAutomationAsync.";
                logger.LogWarning(ex, logMessage);
                await _logHubContext.Clients.All.SendAsync(
                    "ReceiveLogEntry",
                    $"[Wavekey WARNING] {logMessage}"
                );
            }
        }
    }

    public Task CloseAutomationBrowserAsync()
    {
        logger.LogInformation("CloseAutomationBrowserAsync called, invoking StopAutomationAsync.");
        return StopAutomationAsync();
    }
}
