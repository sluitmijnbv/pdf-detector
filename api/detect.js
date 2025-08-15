import { PDFDocument } from 'pdf-lib';
import Busboy from 'busboy';

export const config = {
  api: {
    bodyParser: false, // we gebruiken Busboy
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const fileBuffer = await new Promise((resolve, reject) => {
      const busboy = Busboy({ headers: req.headers });
      let buffers = [];

      busboy.on('file', (fieldname, file) => {
        file.on('data', (data) => buffers.push(data));
        file.on('end', () => resolve(Buffer.concat(buffers)));
      });

      busboy.on('error', reject);
      req.pipe(busboy);
    });

    const pdfDoc = await PDFDocument.load(fileBuffer);
    const pages = pdfDoc.getPages();
    const pageCount = pages.length;

    // Formaat detectie op basis van eerste pagina
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Omrekening naar mm (1 pt = 0.3528 mm)
    const widthMM = width * 0.3528;
    const heightMM = height * 0.3528;

    const format = detectISOFormat(widthMM, heightMM);

    res.status(200).json({
      iso_format: format,
      pages: pageCount,
      width_mm: Math.round(widthMM),
      height_mm: Math.round(heightMM),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PDF detectie mislukt' });
  }
}

function detectISOFormat(w, h) {
  const sizes = {
    A0: [841, 1189],
    A1: [594, 841],
    A2: [420, 594],
    A3: [297, 420],
    A4: [210, 297],
  };

  const tolerance = 10; // mm speling
  for (let [name, [sw, sh]] of Object.entries(sizes)) {
    if (
      Math.abs(w - sw) <= tolerance && Math.abs(h - sh) <= tolerance ||
      Math.abs(w - sh) <= tolerance && Math.abs(h - sw) <= tolerance
    ) {
      return name;
    }
  }
  return 'Onbekend';
}

