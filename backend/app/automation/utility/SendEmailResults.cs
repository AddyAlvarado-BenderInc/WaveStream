using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using DotNetEnv;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace backend.automation.modules
{
    public class SendEmailResults
    {
        private readonly string _sgApiKey;
        private readonly string _senderEmail;
        private readonly string _receiverEmailOne;
        private readonly string _receiverEmailTwo;
        private readonly Func<string, Task> _signalRLogger;

        public SendEmailResults(Func<string, Task> signalRLogger)
        {
            _signalRLogger = signalRLogger ?? (async (msg) => await Task.CompletedTask);

            _sgApiKey = Env.GetString("SENDGRID_API_KEY", "DEFAULT_API_KEY");
            _senderEmail = Env.GetString("SENDER_EMAIL", "DEFAULT_SENDER_EMAIL");
            _receiverEmailOne = Env.GetString("PRIMARY_EMAIL", "DEFAULT_USER_EMAIL");
            _receiverEmailTwo = Env.GetString("SECONDARY_EMAIL", "DEFAULT_CC_EMAIL");
        }

        private string CountIsZeroHelper(int zeroBasedIndex)
        {
            if (zeroBasedIndex == 0)
            {
                return "starting product";
            }
            return "product " + (zeroBasedIndex + 1);
        }

        private string GenerateHighlightedProductListHtml(
            int highlightIndex,
            List<dynamic> products
        )
        {
            var sb = new StringBuilder();
            for (int i = 0; i < products.Count; i++)
            {
                string productName = (string?)products[i].ItemName ?? "Unknown Product";
                if (i == highlightIndex)
                {
                    sb.Append(
                        $"<div style=\"background-color: #ffcccc; padding: 4px; border-radius: 4px;\">{System.Net.WebUtility.HtmlEncode(productName)} ❌</div>"
                    );
                }
                else
                {
                    sb.Append($"<div>{System.Net.WebUtility.HtmlEncode(productName)}</div>");
                }
            }
            return sb.ToString();
        }

        private string GenerateFailurePlainTextBody(
            int highlightIndex,
            List<dynamic> products,
            string errorMessage
        )
        {
            var sb = new StringBuilder();
            sb.AppendLine("Error occurred while processing:");
            for (int i = 0; i < products.Count; i++)
            {
                string productName = (string?)products[i].ItemName ?? "Unknown Product";
                if (i == highlightIndex)
                {
                    sb.AppendLine($">>> {productName} <<< --- FAILED AT THIS PRODUCT");
                }
                else
                {
                    sb.AppendLine(productName);
                }
            }
            sb.AppendLine($"\nError Details:\n{errorMessage}");
            return sb.ToString();
        }

        public async Task SendNotificationEmailAsync(
            int countForEmailSubject,
            List<dynamic> fullProductList,
            bool isFailureNotification = false,
            string? failureDetails = null,
            string? specificProductNameForFailureSubject = null
        )
        {
            if (string.IsNullOrEmpty(_sgApiKey) || _sgApiKey == "DEFAULT_API_KEY")
            {
                string apiKeyError =
                    "SendGrid API key not configured or is default. Email will not be sent.";
                Console.WriteLine(apiKeyError);
                await _signalRLogger($"[EmailService] {apiKeyError}");
                return;
            }

            if (string.IsNullOrEmpty(_senderEmail) || _senderEmail == "DEFAULT_SENDER_EMAIL")
            {
                string senderEmailError =
                    "Sender email not configured or is default. Email will not be sent.";
                Console.WriteLine(senderEmailError);
                await _signalRLogger($"[EmailService] {senderEmailError}");
                return;
            }

            var client = new SendGridClient(_sgApiKey);
            var from = new EmailAddress(_senderEmail);
            string subject;
            string htmlContent;
            string plainTextContent;

            List<EmailAddress> tos = new List<EmailAddress>();
            if (
                !string.IsNullOrEmpty(_receiverEmailOne)
                && _receiverEmailOne != "DEFAULT_USER_EMAIL"
            )
            {
                tos.Add(new EmailAddress(_receiverEmailOne));
            }
            if (!string.IsNullOrEmpty(_receiverEmailTwo) && _receiverEmailTwo != "DEFAULT_CC_EMAIL")
            {
                tos.Add(new EmailAddress(_receiverEmailTwo));
            }

            if (!tos.Any())
            {
                string receiverError =
                    "No valid recipient emails configured. Email will not be sent.";
                Console.WriteLine(receiverError);
                await _signalRLogger($"[EmailService] {receiverError}");
                return;
            }

            if (isFailureNotification)
            {
                string failingProductDisplay = specificProductNameForFailureSubject ?? "a product";
                subject =
                    $"Failure at {CountIsZeroHelper(countForEmailSubject)} ({failingProductDisplay}) ❌";

                htmlContent =
                    $@"
                <span>
                    <strong>Error occurred while processing the product list:</strong><br />
                    {GenerateHighlightedProductListHtml(countForEmailSubject, fullProductList)}
                    <br />
                    <strong>Error Details:</strong><br />
                    <pre style='white-space: pre-wrap; word-wrap: break-word;'>{System.Net.WebUtility.HtmlEncode(failureDetails ?? "No specific error details provided.")}</pre>
                </span>";
                plainTextContent = GenerateFailurePlainTextBody(
                    countForEmailSubject,
                    fullProductList,
                    failureDetails ?? "No specific error details provided."
                );
            }
            else
            {
                subject = $"Success ✅ Autofill For {countForEmailSubject} Products Are Complete!";
                var productNames = fullProductList
                    .Take(countForEmailSubject)
                    .Select(p => (string?)p.ItemName ?? "Unknown Product")
                    .ToList();
                string productListHtml = string.Join(
                    "<br />",
                    productNames.Select(pn => System.Net.WebUtility.HtmlEncode(pn))
                );

                htmlContent =
                    $@"
                <span>
                    <h1>The Following {countForEmailSubject} Products Have Been Autofilled</h1>
                    <br />
                    <span>
                        <p>{(productNames.Any() ? productListHtml : "Processed products information.")}</p>
                    </span>
                </span>";
                plainTextContent =
                    $"The following {countForEmailSubject} products have been autofilled: {(productNames.Any() ? string.Join(", ", productNames) : "Processed products information.")}";
            }

            var msg = MailHelper.CreateSingleEmailToMultipleRecipients(
                from,
                tos,
                subject,
                plainTextContent,
                htmlContent
            );

            try
            {
                var response = await client.SendEmailAsync(msg);
                string emailTypeForLog = isFailureNotification ? "Failure" : "Success";
                if (response.IsSuccessStatusCode)
                {
                    string successMsg = $"{emailTypeForLog} Email Sent!";
                    Console.WriteLine(successMsg);
                    await _signalRLogger($"[EmailService] {successMsg}");
                }
                else
                {
                    string errorMsg =
                        $"Failed to send {emailTypeForLog.ToLower()} email. Status Code: {response.StatusCode}. Body: {await response.Body.ReadAsStringAsync()}";
                    Console.WriteLine(errorMsg);
                    await _signalRLogger($"[EmailService] {errorMsg}");
                }
            }
            catch (Exception ex)
            {
                string exceptionMsg =
                    $"Error sending {(isFailureNotification ? "failure" : "success")} email: {ex.ToString()}";
                Console.WriteLine(exceptionMsg);
                await _signalRLogger($"[EmailService] {exceptionMsg}");
            }
        }
    }
}
