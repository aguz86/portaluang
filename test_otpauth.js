import * as OTPAuth from 'otpauth';
let totp = new OTPAuth.TOTP({
  issuer: 'ACME',
  label: 'Alice',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  secret: new OTPAuth.Secret({ size: 20 })
});
console.log(totp.secret.base32);
let token = totp.generate();
console.log(token);
let delta = totp.validate({ token, window: 1 });
console.log(delta);
