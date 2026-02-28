const express = require("express");
const router = express.Router();
const { encrypt, decrypt } = require("../utils/crypto");
const { db } = require("../firebase"); // Firebase Admin SDK
const { doc, setDoc, serverTimestamp } = require("firebase-admin/firestore");

/* ===============================
   🔐 CCAvenue Credentials
   =============================== */
const merchant_id = "4423673";
const access_code = "AVJW88NB21AL14WJLA";
const working_key = "4CE2CC6602914AD1FA96DF7457299700";
const CCAV_ENV = "PROD"; // change to "PROD" later

/* ===============================
   Initiate payment
   =============================== */
router.post("/initiate", (req, res) => {
  const { amount, order_id, customer } = req.body;

  const redirect_url = `https://kirdana.net/payment-success`;
  const cancel_url = `https://kirdana.net/payment-failed`;

  const data = `merchant_id=${merchant_id}&order_id=${order_id}&amount=${amount}&currency=INR&redirect_url=${redirect_url}&cancel_url=${cancel_url}&billing_name=${customer.name}&billing_email=${customer.email}&billing_tel=${customer.phone}`;

  const encRequest = encrypt(data, working_key);

  const paymentUrl =
    CCAV_ENV === "PROD"
      ? "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction"
      : "https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction";

  res.json({
    url: paymentUrl,
    encRequest,
    access_code,
  });
});

/* ===============================
   Handle CCAvenue response
   =============================== */
router.post(
  "/response",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    const encResp = req.body.encResp;

    try {
      const decrypted = decrypt(encResp, working_key);
      console.log("✅ CCAvenue Decrypted Response:", decrypted);

      // Parse key-value pairs
      const parsedData = {};
      decrypted.split("&").forEach((pair) => {
        const [key, value] = pair.split("=");
        parsedData[key] = value;
      });

      // Generate order ID (fallback)
      const orderId = parsedData.order_id || `order_${Date.now()}`;

      // Save payment to Firebase
      try {
        await setDoc(doc(db, "payments", orderId), {
          order_id: parsedData.order_id,
          tracking_id: parsedData.tracking_id,
          bank_ref_no: parsedData.bank_ref_no,
          payment_status: parsedData.order_status || parsedData.status,
          amount: parsedData.amount,
          currency: parsedData.currency,
          billing_name: parsedData.billing_name,
          billing_email: parsedData.billing_email,
          billing_tel: parsedData.billing_tel,
          decrypted_raw: decrypted,
          createdAt: serverTimestamp(),
        });
      } catch (firebaseErr) {
        console.error("❌ Failed to save payment in Firebase:", firebaseErr);
      }

      // Redirect frontend safely using only orderId
      res.redirect(
        `https://kirdana.net/payment-success?order_id=${encodeURIComponent(orderId)}`,
      );
    } catch (err) {
      console.error("❌ CCAvenue Response Decrypt Error:", err);

      // Save failed attempt to Firebase
      try {
        await setDoc(doc(db, "payments_failed", `failed_${Date.now()}`), {
          error: err.message,
          encResp: req.body.encResp,
          createdAt: serverTimestamp(),
        });
      } catch (firebaseErr) {
        console.error(
          "❌ Failed to save failed payment in Firebase:",
          firebaseErr,
        );
      }

      res.redirect("https://kirdana.net/payment-failed");
    }
  },
);
/* ===============================
   Handle payment cancel
   =============================== */
router.post("/cancel", (req, res) => {
  res.redirect("https://kirdana.net/payment-failed");
});

module.exports = router;
