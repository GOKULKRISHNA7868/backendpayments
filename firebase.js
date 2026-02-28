// backend/firebase.js
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");

// Load the service account key JSON
const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
});

// Export Firestore database instance
const db = getFirestore();

module.exports = { db };
