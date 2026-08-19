#!/bin/bash
sed -i 's/const rows = filteredTransactions.map/const rows = filteredTransactions.filter(t => t.date >= startDate \&\& t.date <= endDate).map/' src/components/TransactionsView.tsx
