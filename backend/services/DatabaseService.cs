using Npgsql;
using dotenv.net;

public class DatabaseService
{
    private string _connectionString;
    public DatabaseService()
    {
        DotEnv.Load(options: new DotEnvOptions(envFilePaths: new[] { ".env" }));
        _connectionString = DotEnv.Read()["DATABASE_URI"];
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