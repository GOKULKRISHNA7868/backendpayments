const crypto = require("crypto");

const algorithm = "aes-128-cbc";

// CCAvenue standard IV
const iv = Buffer.from([
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c,
  0x0d, 0x0e, 0x0f,
]);

exports.encrypt = (plainText, workingKey) => {
  const key = crypto.createHash("md5").update(workingKey).digest(); // 16 bytes
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

exports.decrypt = (encText, workingKey) => {
  const key = crypto.createHash("md5").update(workingKey).digest();
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
