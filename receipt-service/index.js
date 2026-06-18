const express = require('express');
const crypto = require('crypto');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 4000;
const SECRET = "apollo_secret_123";

/**
 * Verify Razorpay webhook signature
 * @param {Buffer} reqBody - Raw request body buffer
 * @param {string} signature - Razorpay signature from headers
 * @param {string} secret - Webhook secret
 * @returns {boolean}
 */
function verifySignature(reqBody, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(reqBody)
    .digest('hex');
  return expectedSignature === signature;
}

/**
 * Generate a clean, minimal HTML receipt
 * @param {Object} data - Receipt data
 * @returns {string} - HTML string
 */
function generateHTML(data) {
  const { payment_id, amount, phone, patient_name, service, date } = data;
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Receipt - ${payment_id}</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 40px;
          color: #333;
          background-color: #fff;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid #eee;
          padding: 40px;
          border-radius: 8px;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          color: #2563eb;
          font-size: 28px;
        }
        .header h2 {
          margin: 5px 0 0;
          color: #666;
          font-size: 18px;
          font-weight: normal;
        }
        .details-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        .details-col {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .label {
          font-weight: bold;
          color: #555;
          font-size: 14px;
        }
        .value {
          font-size: 16px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #f9fafb;
          color: #555;
        }
        .total-row td {
          font-weight: bold;
          font-size: 18px;
          border-top: 2px solid #333;
          border-bottom: none;
        }
        .text-right {
          text-align: right;
        }
        .footer {
          text-align: center;
          margin-top: 50px;
          color: #888;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Apollo Hospital Chennai</h1>
          <h2>Aranghata Information Centre</h2>
        </div>
        
        <div class="details-grid">
          <div class="details-col">
            <div><span class="label">Patient Name:</span> <span class="value">${patient_name}</span></div>
            <div><span class="label">Phone Number:</span> <span class="value">${phone}</span></div>
          </div>
          <div class="details-col text-right">
            <div><span class="label">Bill No:</span> <span class="value">${payment_id}</span></div>
            <div><span class="label">Date:</span> <span class="value">${date}</span></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Service Description</th>
              <th class="text-right">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${service}</td>
              <td class="text-right">₹${amount.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td class="text-right">Total</td>
              <td class="text-right">₹${amount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          Thank you for choosing Apollo Information Centre.<br>
          This is an electronically generated receipt and does not require a physical signature.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate a PDF from HTML and save it locally
 * @param {string} html - HTML string to convert
 * @param {string} paymentId - Payment ID for the filename
 * @returns {Promise<string>} - Path to the saved PDF
 */
async function createPDF(html, paymentId) {
  const receiptsDir = path.join(__dirname, 'receipts');
  
  // Ensure the receipts folder exists
  if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir, { recursive: true });
  }

  const filePath = path.join(receiptsDir, `receipt_${paymentId}.pdf`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  await page.pdf({
    path: filePath,
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
  });

  await browser.close();
  return filePath;
}

// Webhook endpoint using raw body parser for signature verification
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    
    // 1. Verify signature
    if (!signature || !verifySignature(req.body, signature, SECRET)) {
      return res.status(400).send('Invalid signature');
    }

    // Parse the body to JSON after verification
    const payload = JSON.parse(req.body.toString());

    // 2. Handle only "payment.captured" event
    if (payload.event === 'payment.captured') {
      const paymentEntity = payload.payload.payment.entity;

      // Extract fields
      const payment_id = paymentEntity.id;
      const amount = paymentEntity.amount / 100; // Convert from paise to INR
      const phone = paymentEntity.contact || 'N/A';
      const patient_name = (paymentEntity.notes && paymentEntity.notes.name) ? paymentEntity.notes.name : 'Patient';
      const service = (paymentEntity.notes && paymentEntity.notes.service) ? paymentEntity.notes.service : 'Consultation';
      const date = new Date().toLocaleDateString();

      // 3. Generate HTML
      const html = generateHTML({
        payment_id,
        amount,
        phone,
        patient_name,
        service,
        date
      });

      // 4. Create PDF
      const pdfPath = await createPDF(html, payment_id);

      // 5. Log output
      console.log('Payment captured');
      console.log(`payment_id: ${payment_id}`);
      console.log(`PDF file path: ${pdfPath}`);
    }

    // Return 200 OK
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Endpoint to generate and download PDF manually
app.post('/generate-pdf', express.json(), async (req, res) => {
  try {
    const { payment_id, amount, phone, patient_name, service, date } = req.body;
    
    if (!payment_id || amount === undefined || !patient_name || !service) {
      return res.status(400).send('Missing required fields');
    }

    const html = generateHTML({
      payment_id,
      amount,
      phone: phone || 'N/A',
      patient_name,
      service,
      date: date || new Date().toLocaleDateString()
    });

    const pdfPath = await createPDF(html, payment_id);
    
    // Send the file to the client
    res.download(pdfPath, `receipt_${payment_id}.pdf`, (err) => {
      if (err) {
        console.error('Error sending PDF:', err);
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`Receipt service listening on port ${PORT}`);
});
