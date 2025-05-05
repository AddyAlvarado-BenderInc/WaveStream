using System;
using System.Collections;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Newtonsoft.Json;


class Wavekey
{

    private readonly string baseDirectory;
    private readonly string iconsDir;
    private readonly string pdfsDir;
    private readonly string uploadsDir;
    public Wavekey()
    {
        baseDirectory = AppDomain.CurrentDomain.BaseDirectory;
        iconsDir = Path.Combine(baseDirectory, "icons");
        pdfsDir = Path.Combine(baseDirectory, "pdfs");
        uploadsDir = Path.Combine(baseDirectory, "uploads");
    }

    public void AutoDeleteOldUploads()
    {
        Directory.CreateDirectory(uploadsDir);
        string[] files = Directory.GetFiles(uploadsDir);

        foreach (string file in files)
        {
            FileInfo fileInfo = new FileInfo(file);
            if (fileInfo.Exists)
            {
                File.Delete(file);
            }
        }
    }

    public void AutoDeleteOldPdfs()
    {
        Directory.CreateDirectory(pdfsDir);
        string[] files = Directory.GetFiles(pdfsDir);

        foreach (string file in files)
        {
            FileInfo fileInfo = new FileInfo(file);
            if (fileInfo.Exists)
            {
                File.Delete(file);
            }
        }
    }

    public void AutoDeleteOldIcons()
    {
        Directory.CreateDirectory(iconsDir);
        string[] files = Directory.GetFiles(iconsDir);

        foreach (string file in files)
        {
            FileInfo fileInfo = new FileInfo(file);
            if (fileInfo.Exists)
            {
                File.Delete(file);
            }
        }
    }

    public static async Task DownloadFilesAsync(string url, string filePath)
    {
        try
        {
            using (HttpClient client = new HttpClient())
            {
                HttpResponseMessage response = await client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
                if (!response.IsSuccessStatusCode)
                {
                    throw new HttpRequestException($"Failed to download file from {url}. Status code: {response.StatusCode}");
                }
                using Stream responseStream = await response.Content.ReadAsStreamAsync();
                using FileStream fileStream = new FileStream(filePath, FileMode.Create);
                {
                    await responseStream.CopyToAsync(fileStream);
                }
                Console.WriteLine($"Downloaded {url} to {filePath}");
            }
        }
        catch (Exception)
        {
            Console.WriteLine($"Error: Failed to download file from {url}");
            throw;
        }
    }

    public static object RemoveEmptyValues(object obj)
    {
        if (obj is IList list)
        {
            return list
                .Cast<object>()
                .Select(RemoveEmptyValues)
                .Where(value => value != null && !(value is string && string.IsNullOrEmpty(value.ToString()) || value is IEnumerable && !((IEnumerable)value).GetEnumerator().MoveNext()))
                .ToArray();
        }
        else if (obj is IDictionary dictionary)
        {
            var result = new Dictionary<object, object>();
            foreach (DictionaryEntry entry in dictionary)
            {
                var value = RemoveEmptyValues(entry.Value);
                if (value != null && !(value is string && string.IsNullOrEmpty(value.ToString()) || value is IEnumerable && !((IEnumerable)value).GetEnumerator().MoveNext()))
                {
                    result[entry.Key] = value;
                }
            }
            return result;
        }
        else
        {
            return obj;
        }
    }

    public async Task<List<dynamic>> DifferentiateProductData(string type, dynamic fileData)
    {
        var products = new List<dynamic>();
        var iconsDir = Path.Combine(baseDirectory, "icons");
        var pdfsDir = Path.Combine(baseDirectory, "pdfs");

        if (type == "json-type" && fileData.jsonData != null)
        {
            try
            {
                products = JsonConvert.DeserializeObject<List<dynamic>>(fileData.jsonData);

                Directory.CreateDirectory(iconsDir);
                Directory.CreateDirectory(pdfsDir);

                foreach (var product in products)
                {
                    var iconData = product.Icon?.Package?.content;
                    var iconFilenames = iconData?.filename as IEnumerable<string>;
                    var iconUrls = iconData?.url as IEnumerable<string>;

                    if (iconData != null && iconFilenames!= null && iconUrls!= null && iconFilenames?.Count() == iconUrls?.Count())
                    {
                        Console.WriteLine($"Processing {product.name}");
                        var iconDownloadTasks = new List<Task>();

                        for (int i = 0; i < iconFilenames?.Count(); i++)
                        {
                            var iconUrl = iconUrls?.ElementAt(i);
                            var iconFilename = iconFilenames.ElementAt(i);
                            if (!string.IsNullOrEmpty(iconUrl) && !string.IsNullOrEmpty(iconFilename))
                            {
                                var iconFilePath = Path.Combine(iconsDir, iconFilename);
                                Console.WriteLine($"    Downloading icon from {iconUrl} to {iconFilePath}");
                                iconDownloadTasks.Add(DownloadFilesAsync(iconUrl, iconFilePath));
                            }
                        }

                        try
                        {
                            await Task.WhenAll(iconDownloadTasks);
                            Console.WriteLine($"    Downloaded icons for {product.name}");
                            product.Icon = new { Composite = iconFilenames};
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"    Error: Failed to download icons for {product.name}. {ex.Message}");                            
                            throw;
                        }
                    }
                    else if (product.Icon?.Package?.content!= null)
                    {
                        Console.WriteLine($"    Skipping Icon transformation for product {product.ItemName ?? "Unknown"}: Invalid or empty package content.");
                    }

                    var pdfData = product.Package?.content;
                    var pdfFilenames = pdfData?.filename as IEnumerable<string>;
                    var pdfUrls = pdfData?.url as IEnumerable<string>;

                    if (pdfData!= null && pdfFilenames!= null && pdfUrls!= null && pdfFilenames?.Count() == pdfUrls?.Count())
                    {
                        Console.WriteLine($"    Processing {product.name}");
                        var pdfDownloadTasks = new List<Task>();
                        for (int i = 0; i < pdfFilenames?.Count(); i++)
                        {
                            var pdfUrl = pdfUrls?.ElementAt(i);
                            var pdfFilename = pdfFilenames.ElementAt(i);
                            if (!string.IsNullOrEmpty(pdfUrl) &&!string.IsNullOrEmpty(pdfFilename))
                            {
                                var pdfFilePath = Path.Combine(pdfsDir, pdfFilename);
                                Console.WriteLine($"    Downloading PDF from {pdfUrl} to {pdfFilePath}");
                                pdfDownloadTasks.Add(DownloadFilesAsync(pdfUrl, pdfFilePath));
                            }
                        }

                        try
                        {
                            await Task.WhenAll(pdfDownloadTasks);
                            Console.WriteLine($"    Downloaded PDFs for {product.name}");
                            product.Package = new { Composite = pdfFilenames };
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"    Error: Failed to download PDFs for {product.name}. {ex.Message}");
                            throw;
                        }
                    }
                    else if (product.Package?.content!= null)
                    {
                        Console.WriteLine($"    Skipping Package transformation for product {product.ItemName?? "Unknown"}: Invalid or empty package content.");
                    }
                }

                products = (List<dynamic>)RemoveEmptyValues(products);
            }
            catch (Exception)
            {
                Console.WriteLine($"Error: Failed to parse JSON data from file.");
                throw;
            }
        } else {
            Console.WriteLine("No JSON data found in the file.");
        }
        return products;
    }

    /* public async Task CloseBrowser()
    {
 
    } */

    public async Task RunWavekeyServer()
    {
        string type = "json-type";
        string runOption = "";
        var cellOrigin = new List<string>();
        var jsonData = new List<dynamic>();

        try
        {
            if (cellOrigin == null || cellOrigin.Count == 0)
            {
                Console.WriteLine("Error: Cell origin is not defined.");
                return;
            }
            for (var i = 0; i < cellOrigin.Count; i++)
            {
                var cellOriginObject = JsonConvert.DeserializeObject<dynamic>(cellOrigin[i]);
            }
            Console.WriteLine($"    Running Wavekey Server with type: {type}, runOption: {runOption}");
            Console.WriteLine($"    Starting at Origin {cellOrigin}.");

            var products = new List<dynamic>();

            products = await DifferentiateProductData(type, jsonData);

            Console.WriteLine($"    Products: {JsonConvert.SerializeObject(products, Formatting.Indented)}");
            Console.WriteLine("END OF PROCESSING");

            if (products.Count == 0 || products == null)
            {
                Console.WriteLine("No products found in the file.");
            }

            var automationScript = PrepareAutomation("automation", "RunAutomation.cs");
            
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: Failed to run Wavekey Server. {ex.Message}");
            throw;
        }
    }

    public object PrepareAutomation(string folder, string scriptName)
    {
        string scriptPath = Path.Combine(baseDirectory, folder, scriptName);
        return scriptPath;
    }
}