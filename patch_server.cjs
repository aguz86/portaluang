const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetToRemove = `  // 5. Sandbox Payment Simulation (Instant Testing for Duitku flow)
  app.post('/api/payment/duitku/simulate-sandbox-pay', async (req, res) => {
    try {
      const { merchantOrderId } = req.body;
      if (!merchantOrderId) {
        return res.status(400).json({ success: false, error: 'Merchant Order ID is required' });
      }

      const txList = await getAllTransactions(pool);
      const tx = txList.find(t => t.merchantOrderId === merchantOrderId);
      if (!tx) {
        return res.status(404).json({ success: false, error: 'Transaksi tidak ditemukan' });
      }

      const config = await getDuitkuConfig(pool);
      const signature = crypto.createHash('md5')
        .update(\`\${config.merchantCode}\${tx.amount}\${merchantOrderId}\${config.apiKey}\`)
        .digest('hex');

      // Trigger standard webhook loic
      const simReq = {
        body: {
          merchantCode: config.merchantCode,
          amount: tx.amount,
          merchantOrderId: merchantOrderId,
          signature: signature,
          resultCode: '00',
          reference: tx.reference,
          additionalParam: JSON.stringify({ planId: tx.planId, userId: tx.userId })
        }
      } as any;

      let responseSent = false;
      const simRes = {
        status: (code: number) => ({
          json: (data: any) => {
            if (!responseSent) {
              responseSent = true;
              res.status(code).json({
                success: true,
                message: 'Simulasi pelunasan Duitku berhasil. Webhook signature diverifikasi.',
                transaction: { ...tx, status: 'SUCCESS' },
                data
              });
            }
          }
        })
      } as any;

      await handleDuitkuWebhook(simReq, simRes);
    } catch (err: any) {
      console.error('Error in sandbox simulation:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });`;

content = content.replace(targetToRemove, '');

const webhookTarget = `      // In production, signature MUST match. In sandbox/dev, log verification result
      if (!isValid && config.env === 'production') {
        console.error('Security Alert: Duitku Webhook signature mismatch!');
        return res.status(400).json({ success: false, error: 'Invalid MD5 signature' });
      }`;

const webhookReplacement = `      // Signature MUST match in BOTH environments to ensure valid incoming webhook
      if (!isValid) {
        console.error('Security Alert: Duitku Webhook signature mismatch!');
        return res.status(400).json({ success: false, error: 'Invalid MD5 signature' });
      }`;

content = content.replace(webhookTarget, webhookReplacement);

fs.writeFileSync('server.ts', content);
