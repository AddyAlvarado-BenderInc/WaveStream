# WaveStream

Hello Everyone,

WaveStream is a project rooted in business automation, designed to streamline processes like data entry, product creation, and product management. Over time, it has evolved into a versatile, table-focused automation tool that can be seamlessly integrated into any business workflow.

If you're reading this, I've open-sourced the project so other developers can use it for their own business or organizational needs. WaveStream features a powerful frontend for creating CSV or JSON files and a robust backend boilerplate for building automation workflows. These workflows can leverage custom APIs or testing libraries like Playwright, Puppeteer, Selenium, and more.

The frontend feels like a sleeker, more automation-oriented version of Excel or a traditional spreadsheet tool. Looking ahead, I plan to integrate REST API functionality to enable automatic data updates to the tables—hooray for automation!

## Synopsis

**(Space reserved for your project synopsis - describe what the project does in a few sentences here.)**

## Key Features

WaveStream is packed with features to streamline data management and automation workflows.

### Frontend (Built with Next.js & React)

*   **Dynamic Data Tables:**
    *   A powerful and interactive table interface, similar to a spreadsheet, designed for managing complex data sets.
    *   Import table headers (Class Keys) and row data directly from CSV or TXT files.
    *   Manipulate cells individually: edit values, delete, or clear.
    *   Perform column-wide operations: clear all data in a column, disable cells, or set a default value for empty cells.
    *   Efficient row operations like "Extend Value Down" and "Fill Empty Cells Below".
    *   Zoom controls (zoom in, out, reset) for better visibility of large tables.
*   **Advanced Variable Management:**
    *   Create reusable "Variable Classes" to define structured data templates.
    *   Define "Variable Packages" for managing linked media assets like icons and PDFs.
    *   Supports multiple input types for variables:
        *   **Single Line Strings:** For simple text inputs.
        *   **Descriptions (Textarea):** For longer, multi-line text.
        *   **Linked Media:** Select and package uploaded icons (images) and PDFs.
    *   Utilize **interpolated variables** (e.g., `%{myVariable}`) within your Variable Class definitions.
    *   Leverage powerful **`$COMP<...>` directives** directly in parameter values to generate multi-row composite data entries in the table.
    *   Easily send data from defined Variable Classes or Packages directly into specific columns in the main data table.
*   **Product & Stream Management:**
    *   Create and manage "Product Managers" (or "Streams") which act as containers for your data and automation configurations.
    *   Upload and associate icons and PDF files with each Product Manager.
    *   Intuitive UI for editing Product Manager details.
*   **User Experience:**
    *   Real-time feedback through toast notifications.
    *   Light and Dark theme options for user preference.
    *   Organized component structure for maintainability.

### Backend (Built with ASP.NET Core)

*   **Automation Engine:**
    *   Robust C# backend ready to execute automation tasks.
    *   Integrated with **Playwright** for sophisticated browser automation (currently configured for Chromium).
    *   Supports headless browser operations for background tasks.
*   **Real-time Logging:**
    *   SignalR hub for broadcasting log entries from the backend to the frontend in real-time, providing visibility into automation processes.
*   **API Endpoints:**
    *   Handles requests from the frontend to trigger automation runs.
    *   Processes JSON data and multipart/form-data containing automation parameters and associated files.
*   **Data Persistence:**
    *   Utilizes MongoDB for storing Product Manager configurations, variable definitions, and table data.
    *   Leverages GridFS for efficient storage and retrieval of uploaded files (icons, PDFs).

### Automation Capabilities

*   **Data-Driven Automation:** The frontend table serves as the primary source of data for automation runs.
*   **Flexible Automation Targets:** While initially designed for specific business needs, the backend can be adapted to automate various web-based tasks using Playwright.
*   **JSON Export:** The frontend is designed to prepare and export data in JSON format, suitable for consumption by backend automation scripts or other services.
*   **Server Selection:** Choose between different server configurations (e.g., 'javascript-server', 'csharp-server') for running automations.

## Getting Started

### Prerequisites

*   Node.js (for frontend and potentially backend tooling)
*   .NET SDK (for backend)
*   MongoDB instance

### Frontend Setup

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```
3.  Create a `.env.local` file in the `frontend` directory and configure necessary environment variables (e.g., `NEXTAUTH_URL`, API endpoints).
4.  Run the development server:
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The frontend will typically be available at `http://localhost:3000`.

### Backend Setup

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Restore dependencies:
    ```bash
    dotnet restore
    ```
3.  Create a `.env` file in the `backend` directory and configure necessary environment variables (e.g., MongoDB connection string, SignalR Hub URL).
4.  Run the backend application:
    ```bash
    dotnet run
    ```

## Future Plans

*   **Direct REST API for Table Data:** Implement endpoints to allow external systems or scripts to programmatically push data into the WaveStream tables, further enhancing automation possibilities.
*   **Enhanced Export Options:** Expand beyond JSON to include direct CSV export from the main table.
*   **User Authentication & Authorization:** Implement a more robust security model.
*   **More Automation Adapters:** Explore integrations with other automation libraries like Puppeteer or Selenium.

## Contributing

Contributions are welcome! If you'd like to contribute, please fork the repository and submit a pull request. For major changes, please open an issue first to discuss what you would like to change.

*(You can add more specific contribution guidelines here if you wish)*