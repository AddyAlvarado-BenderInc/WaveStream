### Backend Setup

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  **Install Playwright Browsers (if not already installed globally or if you want project-specific versions):**
    The project uses Playwright. While the .NET package installs the library, you might need to install the browser binaries.
    ```bash
    pwsh bin/Debug/net9.0/playwright.ps1 install 
    # Or, if you have Playwright CLI installed globally:
    # playwright install
    ```
    (Adjust `net9.0` if your target framework in `backend.csproj` is different.)
3.  Restore .NET dependencies:
    ```bash
    dotnet restore
    ```
4.  **Configure Environment Variables:**
    Create a `.env` file in the `backend` directory (refer to `.env.example` if one exists, or check `Program.cs` for `DotNetEnv.Env.Load()` and required variables).
    Key variables likely include:
    *   `MONGODB_CONNECTION_STRING`: Your MongoDB connection URI.
    *   `SIGNALR_HUB_URL`: The URL the frontend will use to connect to the SignalR hub (e.g., `http://localhost:5000/logHub` if your backend runs on port 5000).
    *   Other service-specific API keys or configurations.
5.  Run the backend application:
    ```bash
    dotnet run
    ```
    The backend API and SignalR hub will start. Check the console output for the listening URLs (e.g., `http://localhost:5000` or `https://localhost:5001`).