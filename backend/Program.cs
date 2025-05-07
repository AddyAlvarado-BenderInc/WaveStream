using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

class Program
{
    public static void Main(string[] args)
    {
        DotNetEnv.Env.Load();

        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddSingleton<DatabaseService>();
        builder.Services.AddSingleton<Wavekey>();
        builder.Services.AddLogging(configure => configure.AddConsole());

        builder.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
            });
        });

        var app = builder.Build();

        app.UseCors();

        app.MapGet("/", () => Results.Ok("Server is running, welcome to Wavekey!"));

        app.MapPost(
            "/cs-server",
            async (HttpRequest request, Wavekey wavekey, ILogger<Program> logger) =>
            {
                try
                {
                    if (!request.HasFormContentType)
                    {
                        return Results.BadRequest("Expected multipart/form-data request.");
                    }

                    var form = await request.ReadFormAsync();
                    var type = form["type"].FirstOrDefault();
                    var runOption = form["runOption"].FirstOrDefault();
                    var cellOriginJson = form["cellOrigin"].FirstOrDefault();
                    var jsonData = form["jsonData"].FirstOrDefault();
                    var file = form.Files.FirstOrDefault();

                    if (string.IsNullOrEmpty(type))
                    {
                        return Results.BadRequest(new { message = "Missing 'type' parameter." });
                    }
                    if (type == "json-type" && string.IsNullOrEmpty(jsonData))
                    {
                        return Results.BadRequest(
                            new { message = "Missing 'jsonData' for type 'json-type'." }
                        );
                    }
                    if (string.IsNullOrEmpty(cellOriginJson))
                    {
                        logger.LogWarning("Missing 'cellOrigin' data in request.");
                    }

                    logger.LogInformation(
                        "Processing request - Type: {Type}, RunOption: {RunOption}",
                        type,
                        runOption ?? "N/A"
                    );

                    var resultProducts = await wavekey.ProcessRequestAsync(
                        type,
                        runOption,
                        cellOriginJson,
                        jsonData,
                        file
                    );

                    if (resultProducts == null || !resultProducts.Any())
                    {
                        logger.LogWarning("No valid products were processed or returned.");
                    }

                    _ = wavekey.AutoDeleteOldUploadsAsync();
                    _ = wavekey.AutoDeleteOldIconsAsync();
                    _ = wavekey.AutoDeleteOldPdfsAsync();

                    return Results.Ok(
                        new
                        {
                            message = "Request processed successfully.",
                            products = resultProducts ?? new List<dynamic>(),
                        }
                    );
                }
                catch (ArgumentException ex)
                {
                    logger.LogError(ex, "Bad request data provided.");
                    return Results.BadRequest(new { message = ex.Message });
                }
                catch (JsonReaderException ex)
                {
                    logger.LogError(ex, "Invalid JSON format provided in request.");
                    return Results.BadRequest(
                        new { message = $"Invalid JSON format: {ex.Message}" }
                    );
                }
                catch (CsvHelper.CsvHelperException ex)
                {
                    logger.LogError(ex, "Invalid CSV format or content.");
                    return Results.BadRequest(
                        new { message = $"Invalid CSV format or content: {ex.Message}" }
                    );
                }
                catch (HttpRequestException ex)
                {
                    logger.LogError(ex, "Failed to download a required resource.");
                    return Results.Problem(
                        "Failed to download a required external resource.",
                        statusCode: StatusCodes.Status502BadGateway
                    );
                }
                catch (Exception ex)
                {
                    logger.LogError(
                        ex,
                        "An unexpected error occurred processing /cs-server request."
                    );
                    return Results.Problem(
                        "An internal server error occurred. Please try again later.",
                        statusCode: 500
                    );
                }
            }
        );

        app.MapPost(
            "/close-browser",
            async (Wavekey wavekey, ILogger<Program> logger) =>
            {
                try
                {
                    await wavekey.CloseAutomationBrowserAsync();
                    logger.LogInformation("Close browser request processed.");
                    return Results.Ok(new { message = "Browser close request processed." });
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Error processing /close-browser request.");
                    return Results.Problem("An internal server error occurred.", statusCode: 500);
                }
            }
        );

        app.Run();
    }
}
