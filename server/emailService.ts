import * as nodemailer from 'nodemailer';
import pdfkit from 'pdfkit';
const PDFDocument = (pdfkit as any).default || pdfkit;


// Setup nodemailer transporter
// Users need to configure these in .env.example
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const generateInvoicePDFBuffer = (invoiceData: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a document with compression enabled for minimal size
      const doc = new PDFDocument({ margin: 50, compress: true, size: 'A5' });
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Simple, efficient PDF layout
      doc.fontSize(20).font('Helvetica-Bold').text('INVOICE / BUKTI PEMBAYARAN', { align: 'center' });
      doc.moveDown(1);
      
      doc.fontSize(12).font('Helvetica').fillColor('#333333');
      doc.text(`ID Tagihan: ${invoiceData.merchantOrderId}`);
      doc.text(`Tanggal Lunas: ${new Date().toLocaleString('id-ID')}`);
      doc.text(`Pelanggan: ${invoiceData.customerName || invoiceData.email}`);
      doc.moveDown(1);
      
      doc.text(`Detail Produk: ${invoiceData.planName}`);
      doc.text(`Metode Pembayaran: ${invoiceData.paymentMethodName}`);
      doc.moveDown(0.5);
      
      doc.fontSize(14).font('Helvetica-Bold').text(`Total Pembayaran: Rp ${invoiceData.amount.toLocaleString('id-ID')}`);
      doc.moveDown(1);
      
      // LUNAS Stamp
      doc.rect(doc.x, doc.y, 200, 40).stroke('#10b981');
      doc.fontSize(16).fillColor('#10b981').text('LUNAS / PAID', doc.x, doc.y + 12, { align: 'center', width: 200 });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export const sendInvoiceEmail = async (userEmail: string, invoiceData: any) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Email Service] SMTP credentials not set. Skipping invoice email.');
    return;
  }

  try {
    const pdfBuffer = await generateInvoicePDFBuffer(invoiceData);
    
    const mailOptions = {
      from: `"Portal Uang" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `Invoice Pembayaran Lunas - ${invoiceData.planName}`,
      text: `Halo ${invoiceData.customerName || userEmail},\n\nTerima kasih telah memperpanjang langganan Portal Uang. Pembayaran Anda sebesar Rp ${invoiceData.amount.toLocaleString('id-ID')} telah kami terima (LUNAS).\n\nTerlampir file invoice resmi untuk Anda.\n\nSalam,\nTim Portal Uang`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2>Pembayaran Berhasil (LUNAS)</h2>
          <p>Halo <strong>${invoiceData.customerName || userEmail}</strong>,</p>
          <p>Terima kasih telah memperpanjang langganan Portal Uang. Pembayaran Anda untuk <strong>${invoiceData.planName}</strong> telah kami terima.</p>
          <p>Terlampir file PDF invoice resmi sebagai bukti pembayaran Anda. Kami telah mengompresi file ini untuk menghemat ruang penyimpanan Anda.</p>
          <br/>
          <p>Salam hangat,<br/><strong>Tim Portal Uang</strong></p>
        </div>
      `,
      attachments: [
        {
          filename: `Invoice_Lunas_${invoiceData.merchantOrderId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Invoice successfully sent to ${userEmail}`);
  } catch (error) {
    console.error(`[Email Service] Failed to send invoice to ${userEmail}:`, error);
  }
};
