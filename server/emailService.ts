import pdfkit from 'pdfkit';
import {
  sendEmail,
  getEmailConfig,
  getEmailTemplates,
  renderTemplateText,
  textToHtmlParagraphs,
  wrapEmailLayout
} from './email';

const PDFDocument = (pdfkit as any).default || pdfkit;

export const generateInvoicePDFBuffer = (invoiceData: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, compress: true, size: 'A5' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const isComp = Boolean(invoiceData.isCompensation);

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(isComp ? 'INVOICE KOMPENSASI & BONUS DURASI' : 'INVOICE / BUKTI PEMBAYARAN', { align: 'center' });
      doc.moveDown(1);

      doc.fontSize(11).font('Helvetica').fillColor('#333333');
      doc.text(`ID Tagihan / Invoice: ${invoiceData.merchantOrderId}`);
      doc.text(
        `Tanggal Terbit: ${new Date(invoiceData.paidAt || invoiceData.createdAt || Date.now()).toLocaleString('id-ID')}`
      );
      doc.text(`Pelanggan: ${invoiceData.customerName || invoiceData.email} (${invoiceData.email || '-'})`);
      doc.moveDown(0.8);

      doc.text(`Detail Layanan: ${invoiceData.planName}`);
      doc.text(`Metode / Sumber: ${invoiceData.paymentMethodName || 'Duitku'}`);
      if (isComp && invoiceData.bonusDays) {
        doc.text(`Tambahan Masa Aktif: +${invoiceData.bonusDays} Hari`);
      }
      if (invoiceData.reason) {
        doc.text(`Keterangan: ${invoiceData.reason}`);
      }
      if (invoiceData.newExpiresAt) {
        doc.text(
          `Aktif Sampai Dengan: ${new Date(invoiceData.newExpiresAt).toLocaleString('id-ID', {
            dateStyle: 'long',
            timeStyle: 'short',
          })}`
        );
      }
      doc.moveDown(0.8);

      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .text(
          isComp
            ? `Total Pembayaran: Rp 0 (Kompensasi Gratis)`
            : `Total Pembayaran: Rp ${Number(invoiceData.amount || 0).toLocaleString('id-ID')}`
        );
      doc.moveDown(1);

      doc.rect(doc.x, doc.y, 220, 38).stroke('#10b981');
      doc
        .fontSize(14)
        .fillColor('#10b981')
        .text(isComp ? 'KOMPENSASI AKTIF / LUNAS' : 'LUNAS / PAID', doc.x, doc.y + 11, {
          align: 'center',
          width: 220,
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export const sendInvoiceEmail = async (userEmail: string, invoiceData: any, pool?: any) => {
  try {
    const cfg = await getEmailConfig(pool);
    const templates = await getEmailTemplates(pool);
    const tpl = templates.invoice;
    if (tpl && !tpl.enabled) {
      return { success: true, messageId: 'skipped_disabled_by_admin' };
    }

    const pdfBuffer = await generateInvoicePDFBuffer(invoiceData);
    const vars: Record<string, string> = {
      name: String(invoiceData.customerName || userEmail),
      email: String(userEmail),
      planName: String(invoiceData.planName || 'Pro'),
      amount: Number(invoiceData.amount || 0).toLocaleString('id-ID'),
      invoiceId: String(invoiceData.merchantOrderId || '-'),
      appName: cfg.appName,
      appVersion: cfg.appVersion,
      appUrl: cfg.appUrl,
    };

    const subject = renderTemplateText(tpl.subject, vars, false);
    const title = renderTemplateText(tpl.title, vars, false);
    const plainBody = renderTemplateText(tpl.body, vars, false);

    const result = await sendEmail(pool, {
      to: userEmail,
      subject,
      text: plainBody,
      html: wrapEmailLayout(cfg.appName, title, textToHtmlParagraphs(plainBody), cfg.appUrl),
      attachments: [
        {
          filename: `Invoice_Lunas_${invoiceData.merchantOrderId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    if (result.success) {
      console.log(`[Email Service] Invoice sent via ${result.provider} to ${userEmail}`);
    } else {
      console.warn(`[Email Service] Could not send invoice to ${userEmail}: ${result.error}`);
    }
    return result;
  } catch (error) {
    console.error(`[Email Service] Failed to send invoice to ${userEmail}:`, error);
    return { success: false, error: String(error) };
  }
};

export const sendCompensationEmail = async (
  userEmail: string,
  data: {
    customerName?: string;
    bonusDays: number;
    reason: string;
    newExpiresAt: string;
    invoiceData?: any;
  },
  pool?: any
) => {
  try {
    const cfg = await getEmailConfig(pool);
    const expiryFormatted = new Date(data.newExpiresAt).toLocaleString('id-ID', {
      dateStyle: 'long',
      timeStyle: 'short',
    });

    const plainBody = [
      `Halo ${data.customerName || userEmail},`,
      ``,
      `Sebagai bentuk apresiasi dan kompensasi atas pemeliharaan/pembaruan sistem ${cfg.appName}, kami telah menambahkan durasi masa aktif langganan Anda sebanyak +${data.bonusDays} Hari.`,
      ``,
      `Rincian Kompensasi:`,
      `- Tambahan Durasi: +${data.bonusDays} Hari`,
      `- Keterangan: ${data.reason}`,
      `- Masa Aktif Baru Berakhir Pada: ${expiryFormatted}`,
      data.invoiceData?.merchantOrderId ? `- Nomor Invoice Kompensasi: ${data.invoiceData.merchantOrderId} (Rp 0 / LUNAS)` : '',
      ``,
      `Invoice kompensasi sudah terintegrasi di menu Profil & Langganan pada akun Anda.`,
      `Terima kasih atas kepercayaan dan kesabaran Anda menggunakan ${cfg.appName}.`,
    ]
      .filter(Boolean)
      .join('\n');

    const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];
    if (data.invoiceData) {
      try {
        const pdfBuffer = await generateInvoicePDFBuffer(data.invoiceData);
        attachments.push({
          filename: `Invoice_Kompensasi_${data.invoiceData.merchantOrderId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        });
      } catch (pdfErr) {
        console.warn('[Email Service] Failed generating compensation PDF attachment:', pdfErr);
      }
    }

    const result = await sendEmail(pool, {
      to: userEmail,
      subject: `[${cfg.appName}] Kompensasi Perpanjangan Langganan +${data.bonusDays} Hari`,
      text: plainBody,
      html: wrapEmailLayout(
        cfg.appName,
        `Kompensasi Langganan +${data.bonusDays} Hari Aktif`,
        textToHtmlParagraphs(plainBody),
        cfg.appUrl
      ),
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return result;
  } catch (error) {
    console.error(`[Email Service] Failed sending compensation email to ${userEmail}:`, error);
    return { success: false, error: String(error) };
  }
};
