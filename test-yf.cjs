const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = YahooFinance ? new YahooFinance() : new (require('yahoo-finance2'))();
async function test() {
  console.log(typeof require('yahoo-finance2').default);
}
test();
