const { authenticator } = require('otplib');
console.log(authenticator.generateSecret());
