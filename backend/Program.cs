using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

class Program
{
    public static async Task Main(string[]args)
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
        dbService.Connect();

        var automation = app.Services.GetRequiredService<Wavekey>();
        // TODO: connect frontend to allow this method to run before uncommenting
        // await automation.runPlaywright();

        app.Run();
    }
}
