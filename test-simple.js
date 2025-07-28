// Simple test to debug date calculations
const { calculateWithdrawalDate } = require('./src/lib/card-utils.ts');

const config = {
  closingDay: 15,
  withdrawalDay: 27,
  withdrawalMonthOffset: 1
};

const transactionDate = new Date('2024-01-10');
const result = calculateWithdrawalDate(transactionDate, config);

console.log('Transaction date:', transactionDate.toDateString());
console.log('Result:', result.toDateString());
console.log('Result year:', result.getFullYear());
console.log('Result month:', result.getMonth());
console.log('Result date:', result.getDate());
console.log('Day of week (0=Sun, 6=Sat):', result.getDay());