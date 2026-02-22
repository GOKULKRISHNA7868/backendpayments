// /src/routes/ccavenue.js
const express = require("express");
const router = express.Router();
const { encrypt, decrypt } = require("../utils/crypto");
const qs = require("querystring");
const admin = require("firebase-admin");

// 🔐 Initialize Firebase Admin SDK
const serviceAccount = require("../firebase-service-account.json"); // Make sure this JSON is present in backend
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

/* ===============================
   CCAvenue PROD Credentials
   =============================== */
const merchant_id = "4423673";
const access_code = "AVJW88NB21AL14WJLA";
const working_key = "4CE2CC6602914AD1FA96DF7457299700";
const CCAV_ENV = "PROD";

/* ===============================
   Initiate Payment
   =============================== */
router.post("/initiate", async (req, res) => {
  try {
    const { amount, order_id, customer, planType, durationDays, userId, role } =
      req.body;

    const redirect_url = "https://kirdana.net/plans"; // frontend route to handle success
    const cancel_url = "https://kirdana.net/payment-failed";

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

    const data = qs.stringify(dataObj);
    const encRequest = encrypt(data, working_key);

    const paymentUrl =
      CCAV_ENV === "PROD"
        ? "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction"
        : "https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction";

    // 🔐 Save pending payment in Firestore
    await db
      .collection("pendingPayments")
      .doc(order_id)
      .set({
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
  } catch (err) {
    console.error("❌ Initiate Payment Error:", err);
    res.status(500).json({ error: "Payment initiation failed" });
  }
});

/* ===============================
   Handle CCAvenue Response
   =============================== */
router.post("/response", async (req, res) => {
  try {
    const encResp = req.body.encResp;
    const decrypted = decrypt(encResp, working_key);

    console.log("✅ CCAvenue Decrypted Response:", decrypted);

    const params = qs.parse(decrypted);
    const { order_id, order_status, amount } = params;

    if (order_status === "Success") {
      // 🔐 Mark pending payment as Success
      const pendingRef = db.collection("pendingPayments").doc(order_id);
      const snap = await pendingRef.get();

      if (snap.exists) {
        const { userId, planType, durationDays, role } = snap.data();
        const startDate = admin.firestore.Timestamp.now();
        const endDate = admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
        );

        // 🔐 Save subscription in "plans" collection
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

        // 🔐 Update pending payment status
        await pendingRef.update({ status: "Success" });
      }
    }

    // Redirect to frontend with full decrypted data
    res.redirect(
      `https://kirdana.net/plans?status=${order_status}&order_id=${order_id}&amount=${amount}`,
    );
  } catch (err) {
    console.error("❌ CCAvenue Response Error:", err);
    res.redirect("https://kirdana.net/payment-failed");
  }
});

/* ===============================
   Handle Payment Cancel
   =============================== */
router.post("/cancel", (req, res) => {
  res.redirect("https://kirdana.net/payment-failed");
});

module.exports = router;
