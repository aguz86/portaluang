import CryptoJS from 'crypto-js';

export const hashPin = (pin: string): string => {
  return CryptoJS.SHA256(pin).toString();
};

export const encryptData = (data: any, pin: string): string => {
  const jsonString = JSON.stringify(data);
  return CryptoJS.AES.encrypt(jsonString, pin).toString();
};

export const decryptData = (encryptedText: string, pin: string): any => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, pin);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) return null;
    return JSON.parse(decryptedString);
  } catch (error) {
    return null;
  }
};
