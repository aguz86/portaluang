import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const sendNotificationEmail = async (type: string, email: string, data: any) => {
  if (!resend) {
    console.log(`[Email Mock] Would send ${type} email to ${email}`);
    return;
  }
  
  let subject = '';
  let html = '';

  switch (type) {
    case 'signup':
      subject = 'Selamat Datang di Portal Uang!';
      html = `<p>Halo ${data.name},</p><p>Terima kasih telah mendaftar. Akun Anda berhasil dibuat.</p>`;
      break;
    case 'reset_pin':
      subject = 'Reset PIN Akun Anda';
      html = `<p>Permintaan reset PIN telah kami terima. Berikut adalah link atau kode reset Anda: ${data.resetCode}</p>`;
      break;
    case 'change_pin':
      subject = 'Perubahan PIN Berhasil';
      html = `<p>PIN Anda baru saja berhasil diubah. Jika ini bukan Anda, segera hubungi dukungan kami.</p>`;
      break;
    case 'renewal':
      subject = 'Perpanjangan Paket Berhasil';
      html = `<p>Terima kasih! Paket langganan Anda (${data.planName}) berhasil diperpanjang. Jumlah dibayar: Rp ${data.amount}</p>`;
      break;
  }

  try {
    await resend.emails.send({
      from: 'admin@portaluang.id', // Pastikan domain sudah diverifikasi di Resend
      to: email,
      subject,
      html,
    });
    console.log(`[Email Success] Sent ${type} to ${email}`);
  } catch (error) {
    console.error(`[Email Error] Failed to send ${type}:`, error);
  }
};
