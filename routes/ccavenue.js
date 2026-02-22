const express = require("express");
const router = express.Router();
const { encrypt, decrypt } = require("../utils/crypto");
const qs = require("querystring");
const admin = require("firebase-admin"); // Firebase Admin SDK
const serviceAccount = require("../firebase-service-account.json"); // Your service account

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

/* ===============================
   🔐 CCAvenue PROD Credentials
   =============================== */
const merchant_id = "4423673";
const access_code = "AVJW88NB21AL14WJLA";
const working_key = "4CE2CC6602914AD1FA96DF7457299700";
const CCAV_ENV = "PROD";

/* ===============================
   Initiate payment
   =============================== */
router.post("/initiate", (req, res) => {
  const { amount, order_id, customer, planType, durationDays, userId, role } =
    req.body;

  // ✅ Must be CCAvenue registered domain
  const redirect_url = "https://kirdana.net/payment-response"; // frontend route to handle success
  const cancel_url = "https://kirdana.net/payment-failed";

  // ✅ Properly encoded data object
  const dataObj = {
    merchant_id,
    order_id,
    amount,
    currency: "INR",
    redirect_url,
    cancel_url,
    billing_name: customer.name,
    billing_email: customer.email,
    billing_tel: customer.phone,
  };

  // ✅ URL encoded string (MANDATORY)
  const data = qs.stringify(dataObj);
  const encRequest = encrypt(data, working_key);

  const paymentUrl =
    CCAV_ENV === "PROD"
      ? "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction"
      : "https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction";

  // 🔐 Save pending payment in Firestore
  const pendingRef = db.collection("pendingPayments").doc(order_id);
  pendingRef.set({
    orderId: order_id,
    userId,
    role,
    planType,
    amount: Number(amount),
    durationDays,
    status: "PENDING",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  res.json({
    url: paymentUrl,
    encRequest,
    access_code,
  });
});

/* ===============================
   Handle CCAvenue response
   =============================== */
router.post("/response", async (req, res) => {
  const encResp = req.body.encResp;

  try {
    const decrypted = decrypt(encResp, working_key);
    console.log("✅ CCAvenue Decrypted Response:", decrypted);

    // Parse response (example: order_id, amount, status)
    const params = qs.parse(decrypted);
    const { order_id, order_status, amount } = params;

    if (order_status === "Success") {
      // 🔐 Update Firestore: mark pending payment as Success
      const pendingRef = db.collection("pendingPayments").doc(order_id);
      const snap = await pendingRef.get();

      if (snap.exists) {
        const { userId, planType, durationDays, role } = snap.data();
        const startDate = admin.firestore.Timestamp.now();
        const endDate = admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
        );

        // Save subscription in "plans" collection
        await db
          .collection("plans")
          .doc(userId)
          .set({
            role,
            freeTrialUsed: false,
            currentPlan: { planType, startDate, endDate, status: "active" },
            history: [
              {
                planType,
                startDate,
                endDate,
                amount: Number(amount),
              },
            ],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        // Update pending payment
        await pendingRef.update({ status: "Success" });
      }
    }

    // Redirect to frontend success page
    res.redirect(
      `https://your-frontend-domain.com/payment-success?data=${encodeURIComponent(decrypted)}`,
    );
  } catch (err) {
    console.error("❌ CCAvenue Response Decrypt Error:", err);
    res.redirect("https://your-frontend-domain.com/payment-failed");
  }
});

/* ===============================
   Handle payment cancel
   =============================== */
router.post("/cancel", (req, res) => {
  res.redirect("https://your-frontend-domain.com/payment-failed");
});

module.exports = router;
