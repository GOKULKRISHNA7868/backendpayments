// backend/firebase.js
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// 🔐 Firebase service account credentials (testing only!)
const serviceAccount = {
  "type": "service_account",
  "project_id": "kridana-3ce60",
  "private_key_id": "ae3446cdf9013dbeaafa6556dc2fd3161abb1de9",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCxqgV4a+4WOB5i\n4vIy73su5X0i9bbYfpUxDVv3lDQ+LgvcQwLKu0p1deZiWPF46g2WebZrHkHFl+kq\nmDr/QIhtsn5XinHkobNmrz4fzMSXEKrcK8dejGHe+6IRwMA/SkF1vl9tlN7s7WQH\na6zeDz0IHGIV6UbUFTFNZDB8teAZlOXJ0nXlYyeDwzjxx5Ngi39a3mthW8muTjrU\nIdBgUCO3H1wahS0sMsmmMDJHHSLzzRF7AHq2V4xYTn8oe67ZcKgWJR6ERorX6sEl\nheWTzS0YyXyppenEetuyjExSpkeXm2OuFBLIKVnEY3KrhFRnAP68zzq0aD4QFz8P\ndr5x8gUxAgMBAAECggEAIIcvjze7lKfbsGE61OaR2Ck+Owtf2c17RUrb3r1sv0Gw\n/Dfsp++Yl17punHsbCX2LOnF42Dby/CfSSQsERXgpKz8gsyfQ6vza8aEClB0YfA0\nSDFfxEjRloDd0IBI8o2G5KbhU+/gzOI94TnuoY2KsBR6ROa8CBKFP1Urp3mpOSWC\nhPiabsSgK3b7giLHXYJBjykZZcYpqLV4jHi4fYDTkvBsCvEdcsxVDxNp6Sib4zEs\nxFIMFpN/cSW7/0YHlLJfXktvM2MJDubve55/gLM057QF780SD0gdoGeCzoBxe3Nm\nVDax65nLJLfA27n5APITnEpT4QFvWBOw9E4JotPjEQKBgQDmcR5cic3pkOjpoe7R\nXJDE+bvu5GXMKXsZ367eGkAiS/7zKDyG/mvBLRsEmlirqoRwaFzgm1D/Iait/E8R\nr/8QB+PT7rcB9eRUpOYeWq9l4uY/i+L9xP5PT25NroMji9uulBk+oOxXZ8YLWVOF\nijMFawzt/tNDscyz+Hj0+nv5RQKBgQDFXmW6ANJ5nvswEyRmx80XPgY/fmZU7nky\nHAqN84KduXgedTFST/YEHKYhI5JT1ODFT4MZkc6W19ogsDd6AeknkA/j1pBQiciA\nSiJ5eUb2nnlRTZLACkdBVyqkVFE5mLvZuIU/gVe0dNUY539Tt87LSq1S2MHAwKqo\nRr1QQ8a8/QKBgQCh0ct1Rhu/qU+1SE5Q3ISYnZn4DpDhhjt4ltfQBXUF4IHetGGU\nljKKy6bOW6hqm+o2mUKnQsnk7vjpfGT10bX1xuSYnWgLy2UUf1tM83d5v5TaCNxU\nQbIndWrKyAI0wvB4Lm1vykdMtYWf0JFTFBHx+xNwSOKIBeHue0xNE1xdVQKBgCDw\nwlWq8XXu/MlnSHoG+snYRj6un/Go431jhLdwXupoHA4pTRQJ2GuTRH7favqm2uTT\ngnPwC+TNHdC62Gd6jilWN/C0zN1EQbx3ow1XGmrqxCC3q7h1frL/E1Td5biRLzkF\nPOf+dF7f6PkBGhUk5lSzn/3lw2CiR1lShSIyTacZAoGAa50ugyfCe8mSEd0DyqbP\nFaTn4vD2ovP758gXqTgMe+t4g3mrMzdZXiwOEUVGXbpsiN1bQN8Pq8cqphXItdYV\npu6ef5Uce2CXU4cWbqTKlMT6iLaQcOEYbE0CCy/ZBFTrok5pqNEpptKXMxQ7X7g7\ngL+TV7T/BCoZqDCBphx71NE=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@kridana-3ce60.iam.gserviceaccount.com",
  "client_id": "115302615888943390388",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40kridana-3ce60.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
});

// Firestore instance
const db = getFirestore();

module.exports = { db };
