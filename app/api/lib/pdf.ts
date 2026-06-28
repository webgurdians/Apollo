import PDFDocument from "pdfkit";
import crypto from "crypto";
import path from "path";
import fs from "fs";

export function getPrescriptionSecureToken(id: number): string {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    throw new Error("APP_SECRET is required for prescription token generation");
  }
  return crypto
    .createHmac("sha256", secret)
    .update(String(id))
    .digest("hex")
    .slice(0, 16);
}

interface Medicine {
  id: number;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
}

interface Test {
  id: number;
  testName: string;
  notes: string | null;
  status: "pending" | "completed";
}

interface PrescriptionDetails {
  id: number;
  patientId: number;
  diagnosisNotes: string;
  createdAt: Date;
  patientName: string | null;
  patientAge: number | null;
  patientGender: string | null;
  patientPhone: string | null;
  doctorName: string | null;
  doctorSpecialty: string | null;
  doctorCredentials: string | null;
  doctorRegNumber: string | null;
  medicines: Medicine[];
  tests: Test[];
}

export function generatePrescriptionPdf(prescription: PrescriptionDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    // Colors
    const primaryColor = "#0284c7"; // Apollo Blue
    const darkColor = "#0f172a";    // Dark Slate
    const grayColor = "#475569";    // Slate Gray
    const lightGray = "#f8fafc";    // Background Light Slate
    const borderGray = "#cbd5e1";   // Border Slate

    // 1. Apollo Header with Logo
    let logoPath = path.resolve(__dirname, "../../public/images/logo.png");
    if (!fs.existsSync(logoPath)) {
      logoPath = path.resolve(process.cwd(), "public/images/logo.png");
    }
    if (!fs.existsSync(logoPath)) {
      logoPath = path.resolve(process.cwd(), "app/public/images/logo.png");
    }

    let headerTextX = 50;
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 50, 45, { width: 45 });
        headerTextX = 105;
      } catch (err) {
        console.error("Failed to render logo image in PDFKit:", err);
      }
    }

    doc.fillColor(primaryColor).fontSize(20).font("Helvetica-Bold").text("APOLLO CLINIC", headerTextX, 48);
    doc.fillColor(grayColor).fontSize(9).font("Helvetica").text("Information Centre Aranghata", headerTextX, doc.y);
    
    const headerY = Math.max(doc.y, 45 + 45);

    // 2. Doctor Info (Right Aligned)
    doc.fillColor(darkColor).fontSize(14).font("Helvetica-Bold").text(`Dr. ${prescription.doctorName || "Doctor"}`, 250, 50, { align: "right", width: 290 });
    doc.fillColor(grayColor).fontSize(9).font("Helvetica").text(`${prescription.doctorSpecialty || "General Medicine"} - ${prescription.doctorCredentials || "MBBS"}`, 250, doc.y, { align: "right", width: 290 });
    doc.text(`Reg No: ${prescription.doctorRegNumber || "N/A"}`, 250, doc.y, { align: "right", width: 290 });

    // Restore X coordinate
    doc.x = 50;
    doc.y = Math.max(headerY, doc.y) + 15;

    // Line separator
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(borderGray).stroke();
    doc.moveDown(1.5);

    // 3. Patient Details Card (Styled Box)
    const cardY = doc.y;
    doc.rect(50, cardY, 495, 50).fill(lightGray);
    doc.fillColor(darkColor).fontSize(10);
    
    // Draw text inside Patient Details box
    doc.font("Helvetica-Bold").text("Patient Name: ", 60, cardY + 10, { continued: true });
    doc.font("Helvetica").text(prescription.patientName || "N/A", { continued: true });
    doc.font("Helvetica-Bold").text("             Age / Gender: ", { continued: true });
    doc.font("Helvetica").text(`${prescription.patientAge ?? "N/A"}y / ${prescription.patientGender || "N/A"}`);

    doc.font("Helvetica-Bold").text("Phone: ", 60, cardY + 28, { continued: true });
    doc.font("Helvetica").text(prescription.patientPhone || "N/A", { continued: true });
    doc.font("Helvetica-Bold").text("             Date: ", { continued: true });
    doc.font("Helvetica").text(new Date(prescription.createdAt).toLocaleDateString());

    doc.y = cardY + 65;

    // 4. Clinical Diagnosis & Notes
    doc.fillColor(primaryColor).fontSize(12).font("Helvetica-Bold").text("Diagnosis & Clinical Notes", 50, doc.y);
    doc.moveDown(0.5);
    doc.fillColor(darkColor).fontSize(10).font("Helvetica").text(prescription.diagnosisNotes, { width: 495, align: "left" });
    doc.moveDown(1.5);

    // Line separator
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(borderGray).stroke();
    doc.moveDown(1.5);

    // 5. Prescribed Medicines (Rx Table)
    if (prescription.medicines && prescription.medicines.length > 0) {
      doc.fillColor(primaryColor).fontSize(12).font("Helvetica-Bold").text("Rx (Prescribed Medicines)", 50, doc.y);
      doc.moveDown(0.8);

      const tableTop = doc.y;
      
      // Header background
      doc.rect(50, tableTop, 495, 20).fill(lightGray);
      doc.fillColor(darkColor).fontSize(9).font("Helvetica-Bold");

      // Header labels
      doc.text("Medicine Name", 60, tableTop + 5, { width: 150 });
      doc.text("Dosage", 210, tableTop + 5, { width: 70 });
      doc.text("Frequency", 290, tableTop + 5, { width: 100 });
      doc.text("Duration", 400, tableTop + 5, { width: 60 });
      doc.text("Instructions", 470, tableTop + 5, { width: 70 });

      let currentY = tableTop + 20;
      doc.font("Helvetica").fontSize(9);

      prescription.medicines.forEach((med) => {
        // Draw row borders
        doc.moveTo(50, currentY).lineTo(545, currentY).strokeColor("#f1f5f9").stroke();

        // Row contents
        doc.fillColor(darkColor).font("Helvetica-Bold").text(med.medicineName, 60, currentY + 5, { width: 140 });
        doc.fillColor(grayColor).font("Helvetica").text(med.dosage, 210, currentY + 5, { width: 70 });
        doc.text(med.frequency, 290, currentY + 5, { width: 100 });
        doc.text(med.duration, 400, currentY + 5, { width: 60 });
        
        const instructions = med.instructions || "N/A";
        doc.fontSize(8).text(instructions, 470, currentY + 5, { width: 70 });
        doc.fontSize(9); // Restore font size

        currentY += 25;
      });

      doc.y = currentY + 15;
    }

    // 6. Diagnostics Referred
    if (prescription.tests && prescription.tests.length > 0) {
      doc.fillColor(primaryColor).fontSize(12).font("Helvetica-Bold").text("Diagnostics Referred", 50, doc.y);
      doc.moveDown(0.5);

      doc.font("Helvetica").fontSize(10);
      prescription.tests.forEach((test) => {
        const testNotes = test.notes ? ` (${test.notes})` : "";
        doc.fillColor(darkColor).text(`•  ${test.testName}`, { continued: true });
        doc.fillColor(grayColor).text(testNotes);
      });
      doc.moveDown(1.5);
    }

    // 7. Footer
    doc.y = doc.page.height - 100;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(borderGray).stroke();
    doc.moveDown(1.5);
    doc.fillColor("#94a3b8").fontSize(8).font("Helvetica").text(
      "This is an official, digitally generated medical prescription. Thank you for choosing Apollo Clinic.",
      { align: "center", width: 495 }
    );

    doc.end();
  });
}

interface ReceiptDetails {
  paymentId: string;
  amount: number;
  phone: string;
  patientName: string;
  service: string;
  date: string;
  status?: string;
}

export function generateReceiptPdf(receipt: ReceiptDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    // Colors
    const primaryColor = "#0284c7"; // Apollo Blue
    const darkColor = "#0f172a";    // Dark Slate
    const grayColor = "#475569";    // Slate Gray
    const lightGray = "#f8fafc";    // Background Light Slate
    const borderGray = "#cbd5e1";   // Border Slate

    // 1. Apollo Header with Logo
    let logoPath = path.resolve(__dirname, "../../public/images/logo.png");
    if (!fs.existsSync(logoPath)) {
      logoPath = path.resolve(process.cwd(), "public/images/logo.png");
    }
    if (!fs.existsSync(logoPath)) {
      logoPath = path.resolve(process.cwd(), "app/public/images/logo.png");
    }

    let headerTextX = 50;
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 50, 45, { width: 45 });
        headerTextX = 105;
      } catch (err) {
        console.error("Failed to render logo image in PDFKit:", err);
      }
    }

    doc.fillColor(primaryColor).fontSize(20).font("Helvetica-Bold").text("APOLLO CLINIC", headerTextX, 48);
    doc.fillColor(grayColor).fontSize(9).font("Helvetica").text("Information Centre Aranghata", headerTextX, doc.y);

    const headerY = Math.max(doc.y, 45 + 45);

    // 2. Receipt Label (Right Aligned)
    doc.fillColor(darkColor).fontSize(14).font("Helvetica-Bold").text("PAYMENT RECEIPT", 250, 50, { align: "right", width: 290 });
    doc.fillColor(grayColor).fontSize(9).font("Helvetica").text(`Receipt No: ${receipt.paymentId}`, 250, doc.y, { align: "right", width: 290 });
    doc.text(`Date: ${receipt.date}`, 250, doc.y, { align: "right", width: 290 });

    // Restore X coordinate
    doc.x = 50;
    doc.y = Math.max(headerY, doc.y) + 25;

    // Line separator
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(borderGray).stroke();
    doc.moveDown(1.5);

    // 3. Receipt Details Card (Styled Box)
    const cardY = doc.y;
    doc.rect(50, cardY, 495, 50).fill(lightGray);
    doc.fillColor(darkColor).fontSize(10);
    
    // Draw text inside Details box
    doc.font("Helvetica-Bold").text("Patient Name: ", 60, cardY + 10, { continued: true });
    doc.font("Helvetica").text(receipt.patientName || "N/A");
    
    doc.font("Helvetica-Bold").text("Phone: ", 60, cardY + 28, { continued: true });
    doc.font("Helvetica").text(receipt.phone || "N/A");

    // Draw Payment Status inside the Details Box (right aligned)
    doc.font("Helvetica-Bold").text("Payment Status: ", 300, cardY + 10, { continued: true });
    const paymentStatus = receipt.status || "Pending Payment";
    const statusColor = paymentStatus.toLowerCase().includes("pending") ? "#b45309" : "#15803d"; // amber-700 vs green-700
    doc.fillColor(statusColor).text(paymentStatus);
    doc.fillColor(darkColor); // Restore color

    doc.y = cardY + 70;

    // 4. Receipt Table (Itemized List)
    doc.fillColor(primaryColor).fontSize(12).font("Helvetica-Bold").text("Receipt Summary", 50, doc.y);
    doc.moveDown(0.8);

    const tableTop = doc.y;
    
    // Header background
    doc.rect(50, tableTop, 495, 20).fill(lightGray);
    doc.fillColor(darkColor).fontSize(9).font("Helvetica-Bold");

    // Header labels
    doc.text("Description / Service", 60, tableTop + 5, { width: 330 });
    doc.text("Amount (INR)", 400, tableTop + 5, { width: 130, align: "right" });

    let currentY = tableTop + 20;
    doc.font("Helvetica").fontSize(9);

    // Draw row borders
    doc.moveTo(50, currentY).lineTo(545, currentY).strokeColor("#f1f5f9").stroke();

    // Row contents
    doc.fillColor(darkColor).font("Helvetica-Bold").text(receipt.service || "Clinic Appointment", 60, currentY + 8, { width: 330 });
    doc.fillColor(darkColor).font("Helvetica-Bold").text(`Rs. ${receipt.amount.toFixed(2)}`, 400, currentY + 8, { width: 130, align: "right" });

    currentY += 30;

    // Total section
    doc.moveTo(50, currentY).lineTo(545, currentY).strokeColor(borderGray).stroke();
    currentY += 5;
    doc.fillColor(primaryColor).fontSize(11).font("Helvetica-Bold").text("Total Paid", 60, currentY + 5, { width: 330 });
    doc.fillColor(primaryColor).fontSize(11).font("Helvetica-Bold").text(`Rs. ${receipt.amount.toFixed(2)}`, 400, currentY + 5, { width: 130, align: "right" });

    // 5. Footer
    doc.y = doc.page.height - 100;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(borderGray).stroke();
    doc.moveDown(1.5);
    doc.fillColor("#94a3b8").fontSize(8).font("Helvetica").text(
      "Thank you for choosing Apollo Clinic. This is an official digitally generated payment receipt.",
      { align: "center", width: 495 }
    );

    doc.end();
  });
}

