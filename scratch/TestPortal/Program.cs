using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using System.Xml.Linq;

class Program
{
    static async Task Main(string[] args)
    {
        var _salesPortalUrl = "http://10.55.55.78:8001/";
        var _terminalId = "DE-PIL2-A1";
        var orderId = "0000413758";
        var client = new HttpClient();

        async Task<XDocument> SendAdmitOneRequestAsync(string xmlBody)
        {
            var content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                { "XML", xmlBody }
            });

            var httpResponse = await client.PostAsync(_salesPortalUrl, content);
            httpResponse.EnsureSuccessStatusCode();

            string xmlResponse = await httpResponse.Content.ReadAsStringAsync();
            Console.WriteLine("--- XML RESPONSE ---");
            Console.WriteLine(xmlResponse);
            return XDocument.Parse(xmlResponse);
        }

        string step1Xml = $"<?xml version=\"1.0\" encoding=\"UTF-8\"?><admitOne requestId=\"543\" terminal=\"{_terminalId}\"><action>query</action><searchReason>2</searchReason><newestFirst>1</newestFirst><audit>{orderId}</audit></admitOne>";
        XDocument step1Response = await SendAdmitOneRequestAsync(step1Xml);

        var admitOne1 = step1Response.Element("admitOne");
        if (admitOne1 == null || admitOne1.Attribute("result")?.Value != "0")
        {
            Console.WriteLine("Step 1 failed.");
            return;
        }

        string handle = admitOne1.Element("handle")?.Value;
        if (string.IsNullOrEmpty(handle))
        {
            Console.WriteLine("No handle returned.");
            return;
        }

        try
        {
            string step2Xml = $"<?xml version=\"1.0\" encoding=\"UTF-8\"?><admitOne requestId=\"543\" terminal=\"{_terminalId}\"><handle>{handle}</handle><action>getBlock</action><newestFirst>1</newestFirst></admitOne>";
            XDocument step2Response = await SendAdmitOneRequestAsync(step2Xml);
            Console.WriteLine("Final response OK");
        }
        finally
        {
            try
            {
                string step3Xml = $"<?xml version=\"1.0\" encoding=\"UTF-8\"?><admitOne requestId=\"530\" terminal=\"{_terminalId}\"><handle>{handle}</handle></admitOne>";
                await SendAdmitOneRequestAsync(step3Xml);
            }
            catch { }
        }
    }
}
