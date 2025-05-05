using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        var webSocketOptions = new WebSocketOptions()
        {
            KeepAliveInterval = TimeSpan.FromSeconds(120),
        };

        builder.Services.AddSingleton<DatabaseService>();
        builder.Services.AddSingleton<Wavekey>();

        var app = builder.Build();

        app.MapGet("/", () => "Server is running, welcome to Wavekey!");

        var dbService = app.Services.GetRequiredService<DatabaseService>();
        //dbService.Connect();

        var automation = app.Services.GetRequiredService<Wavekey>();

        app.MapGet("/cs-server", async () =>
        {
            await automation.RunWavekeyServer();
        });

        /* app.MapGet("/close-browser", async () =>
        {
            await automation.CloseBrowser();
        }); */

        app.Run();
    }
}