const { authenticator } = require('otplib');
const secret = authenticator.generateSecret();
console.log("SECRET:", secret);
