import { TOTP } from 'otplib';
const authenticator = new TOTP();
const secret = authenticator.generateSecret();
const token = authenticator.generate(secret);
console.log(secret, token);
