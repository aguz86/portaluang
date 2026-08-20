import yfPackage from 'yahoo-finance2';
const YahooFinance = (yfPackage as any).default || yfPackage;
const yahooFinance = new YahooFinance();
console.log(typeof yahooFinance.search);
