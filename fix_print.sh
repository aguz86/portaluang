#!/bin/bash
sed -i 's/const executePrint = (startDate: string, endDate: string) => {/const executePrint = (startDate: string, endDate: string) => {\n    setPrintDateRange({ start: startDate, end: endDate });\n    setTimeout(() => {\n/' src/components/TransactionsView.tsx

sed -i 's/generatePDF('\''transactions-view'\'', '\''Laporan_Transaksi.pdf'\'');/generatePDF('\''transactions-view'\'', '\''Laporan_Transaksi.pdf'\'');\n      setTimeout(() => setPrintDateRange(null), 500);\n    }, 300);/' src/components/TransactionsView.tsx
