const fs = require('fs');
let code = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

// Add states
const stateInjection = `
  const [duitkuMethods, setDuitkuMethods] = useState<any[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(true);

  // Fetch available methods on mount
  useEffect(() => {
    let isMounted = true;
    fetch('/api/payment/duitku/methods?amount=' + (finalTotal || 10000))
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && data.methods) {
          setDuitkuMethods(data.methods);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setMethodsLoading(false);
      });
    return () => { isMounted = false; };
  }, [finalTotal]);
`;

code = code.replace(
  'const [qrDataUrl, setQrDataUrl] = useState<string>("");', 
  'const [qrDataUrl, setQrDataUrl] = useState<string>("");\n' + stateInjection
);

fs.writeFileSync('src/pages/Checkout.tsx', code);
