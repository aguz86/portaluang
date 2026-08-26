const fs = require('fs');
let content = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

const target1 = `  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    
    if (isTrial) {
      setProcessingStep("Mengaktifkan akses Free Trial 24 Jam...");
      setTimeout(() => {
        setProcessingStep("Menyiapkan dashboard akun Anda...");
        setTimeout(() => {
          activateUserPlan('free_trial', 'Free Trial (Rp 0)', 0, invoiceId);
          setIsProcessing(false);
          setIsSuccess(true);
        }, 600);
      }, 500);
      return;
    }

    // Strict 4-Step Paid Flow: Pilih Paket -> Bayar Sesuai Paket -> Bayar -> Jika sudah Lunas Baru Paket Terpilih Aktif Otomatis
    setProcessingStep("Menghubungkan ke Duitku Gateway & memverifikasi status pembayaran...");
    
    try {
      const currentOrderId = duitkuInvoice?.merchantOrderId || invoiceId;
      await fetch('/api/payment/duitku/simulate-sandbox-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantOrderId: currentOrderId })
      });

      setProcessingStep("Verifikasi MD5 Signature IPN Duitku berhasil (Status: LUNAS)...");
      
      setTimeout(() => {
        setProcessingStep("Pelunasan Duitku terverifikasi LUNAS! Mengaktifkan paket terpilih secara otomatis...");
        setTimeout(() => {
          let methodLabel = duitkuInvoice?.paymentMethodName || "Duitku Payment Gateway";
          if (paymentMethod === 'qris') {
            methodLabel = "Duitku QRIS Instan";
          } else if (paymentMethod?.startsWith('va_')) {
            methodLabel = \`Duitku Virtual Account \${paymentMethod.replace('va_', '').toUpperCase()}\`;
          } else if (paymentMethod === 'ewallet') {
            methodLabel = \`Duitku E-Wallet (\${ewalletProvider.toUpperCase()})\`;
          }
          activateUserPlan(selectedPlan.id, methodLabel, finalTotal, currentOrderId);
          setIsProcessing(false);
          setIsSuccess(true);
        }, 600);
      }, 600);
    } catch (err) {
      console.error('Error confirming payment:', err);
      setIsProcessing(false);
    }
  };`;

const replacement1 = `  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    
    if (isTrial) {
      setProcessingStep("Mengaktifkan akses Free Trial 24 Jam...");
      setTimeout(() => {
        setProcessingStep("Menyiapkan dashboard akun Anda...");
        setTimeout(() => {
          activateUserPlan('free_trial', 'Free Trial (Rp 0)', 0, invoiceId);
          setIsProcessing(false);
          setIsSuccess(true);
        }, 600);
      }, 500);
      return;
    }

    setProcessingStep("Menghubungkan ke Duitku Gateway & memverifikasi status pembayaran...");
    
    try {
      const currentOrderId = duitkuInvoice?.merchantOrderId || invoiceId;
      const res = await fetch(\`/api/payment/duitku/check-status/\${currentOrderId}\`);
      const data = await res.json();
      
      if (data.success && data.isPaid) {
        setProcessingStep("Pelunasan terverifikasi! Mengaktifkan paket secara otomatis...");
        setTimeout(() => {
          let methodLabel = duitkuInvoice?.paymentMethodName || "Duitku Payment Gateway";
          if (paymentMethod === 'qris') {
            methodLabel = "Duitku QRIS Instan";
          } else if (paymentMethod?.startsWith('va_')) {
            methodLabel = \`Duitku Virtual Account \${paymentMethod.replace('va_', '').toUpperCase()}\`;
          } else if (paymentMethod === 'ewallet') {
            methodLabel = \`Duitku E-Wallet (\${ewalletProvider.toUpperCase()})\`;
          }
          activateUserPlan(selectedPlan.id, methodLabel, finalTotal, currentOrderId);
          setIsProcessing(false);
          setIsSuccess(true);
        }, 600);
      } else {
        setIsProcessing(false);
        alert("Pembayaran belum diterima. Jika Anda sudah membayar, harap tunggu beberapa saat dan coba lagi.");
      }
    } catch (err) {
      setIsProcessing(false);
      alert("Terjadi kesalahan saat mengecek status pembayaran.");
    }
  };`;

content = content.replace(target1, replacement1);
fs.writeFileSync('src/pages/Checkout.tsx', content);
