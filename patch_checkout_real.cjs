const fs = require('fs');
let content = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

const targetRegex = /const handleConfirmPayment = async \(\) => \{[\s\S]*?setIsProcessing\(false\);\n\s*setIsSuccess\(true\);\n\s*\}\n\s*\};/m;

const replacement = `const handleConfirmPayment = async () => {
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

    setProcessingStep("Mengecek status pembayaran ke Duitku Gateway...");
    
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
        alert("Pembayaran belum lunas/diterima oleh Duitku. Silakan selesaikan pembayaran terlebih dahulu (atau tunggu beberapa menit jika sudah bayar).");
      }
    } catch (err) {
      setIsProcessing(false);
      alert("Terjadi kesalahan saat mengecek status pembayaran ke server.");
    }
  };`;

if (targetRegex.test(content)) {
  content = content.replace(targetRegex, replacement);
  fs.writeFileSync('src/pages/Checkout.tsx', content);
  console.log("Successfully replaced handleConfirmPayment");
} else {
  console.log("Regex did not match!");
}
