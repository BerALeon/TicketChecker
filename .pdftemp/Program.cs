using UglyToad.PdfPig;
using System.Linq;
using System;

var pdfPath = @"C:\Users\Rentas 15195\Downloads\A1 Portal Specification 20240405.pdf";
using var document = PdfDocument.Open(pdfPath);

for (int i = 1; i <= document.NumberOfPages; i++)
{
    var page = document.GetPage(i);
    var text = string.Join(" ", page.GetWords().Select(w => w.Text));
    if (text.Contains("getSessionOrders", StringComparison.OrdinalIgnoreCase) && !text.Contains("Complete Message List"))
    {
        Console.WriteLine($"\n========== PAGINA {i} ==========");
        Console.WriteLine(text);
    }
}
