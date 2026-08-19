#!/bin/bash
sed -i 's/const matchesSearch =/const matchesDate = printDateRange ? (tx.date >= printDateRange.start \&\& tx.date <= printDateRange.end) : true;\n      const matchesSearch =/' src/components/TransactionsView.tsx

sed -i 's/return matchesSearch && matchesCat && matchesAcc && matchesType;/return matchesDate \&\& matchesSearch \&\& matchesCat \&\& matchesAcc \&\& matchesType;/' src/components/TransactionsView.tsx
