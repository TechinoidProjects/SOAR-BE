const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const cipherKey = 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3';
const cipherIV = '0102030405060708';

const encrypt = (text) => {
    const cipher = crypto.createCipheriv(algorithm, cipherKey, cipherIV);
    const encrypted = cipher.update(text, 'binary', 'binary') + cipher.final('binary');
    return encrypted;
};

const decrypt = (hash) => {
    const decipher = crypto.createDecipheriv(algorithm, cipherKey, cipherIV);
    const decrypted = decipher.update(hash, 'binary', 'binary') + decipher.final('binary');
    return decrypted;
};

module.exports = {
    encrypt,
    decrypt
};