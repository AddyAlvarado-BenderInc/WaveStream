using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace backend.Hubs
{
    public class LogHub : Hub
    {
        public async Task SendLogEntry(string logEntry)
        {
            await Clients.All.SendAsync("ReceiveLogEntry", logEntry);
        }
    }
}
