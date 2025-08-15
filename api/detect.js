import { PDFDocument } from 'pdf-lib';

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST method allowed" });
  }

  try {
    const arrayBuffer = await req.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const pageCount = pdfDoc.getPageCount();
    const [firstPage] = pdfDoc.getPages();
    const { width, height } = firstPage.getSize();

    // Omrekenen naar mm
    const mmWidth = width * 25.4 / 72;
    const mmHeight = height * 25.4 / 72;

    const formats = {
      A0: { w: 841, h: 1189 },
      A1: { w: 594, h: 841 },
      A2: { w: 420, h: 594 },
      A3: { w: 297, h: 420 },
      A4: { w: 210, h: 297 }
    };

    let iso_format = "Onbekend";
    const tolerance = 5; // mm

    for (const [name, size] of Object.entries(formats)) {
      if (
        (Math.abs(mmWidth - size.w) <= tolerance && Math.abs(mmHeight - size.h) <= tolerance) ||
        (Math.abs(mmWidth - size.h) <= tolerance && Math.abs(mmHeight - size.w) <= tolerance)
      ) {
        iso_format = name;
        break;
      }
    }

    res.status(200).json({
      iso_format,
      pages: pageCount
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fout bij PDF-verwerking" });
  }
}
