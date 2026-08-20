import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
async function test() {
  try {
    const res = await yahooFinance.search('CLEO.JK');
    console.log(res.quotes[0]);
  } catch (e) {
    console.error(e.message);
  }
}
test();
