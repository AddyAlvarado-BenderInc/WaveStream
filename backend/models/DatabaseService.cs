using dotenv.net;
using Npgsql;

public class DatabaseService
{
    private readonly string _connectionString =
        Environment.GetEnvironmentVariable("DATABASE_URI") ?? string.Empty;

    public DatabaseService()
    {
        DotEnv.Load(options: new DotEnvOptions(envFilePaths: new[] { ".env" }));

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            connection.Open();
            Console.WriteLine("Connected to PostgreSQL!");

            using var cmd = new NpgsqlCommand("SELECT version();", connection);
            var result = cmd.ExecuteScalar();
            Console.WriteLine($"PostgreSQL version: {result}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
        }
    }

    public void Connect()
    {
        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            connection.Open();
            Console.WriteLine("Connected to PostgreSQL!");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            throw;
        }
    }
}
