const express = require("express");
const router = express.Router();
const { encrypt, decrypt } = require("../utils/crypto");
const qs = require("querystring");
const { db } = require("../backend/firebase"); // Firebase Admin SDK

/* ===============================
   🔐 CCAvenue PROD Credentials
   =============================== */
const merchant_id = "4423673";
const access_code = "AVJW88NB21AL14WJLA";
const working_key = "4CE2CC6602914AD1FA96DF7457299700";
const CCAV_ENV = "PROD";

/* ===============================
   In-memory payment store
   ⚠️ Still keeping it for quick verification
   =============================== */
global.paymentStore = global.paymentStore || {};

/* ===============================
   Initiate payment
   =============================== */
router.post("/initiate", (req, res) => {
  try {
    const { amount, order_id, customer } = req.body;

    if (!amount || !order_id || !customer?.email) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const redirect_url = "https://kirdana.net/api/payment/response";
    const cancel_url = "https://kirdana.net/api/payment/cancel";

    const dataObj = {
      merchant_id,
      order_id,
      amount,
      currency: "INR",
      redirect_url,
      cancel_url,
      billing_name: customer.name || "User",
      billing_email: customer.email,
      billing_tel: customer.phone || "9999999999",
    };

    const data = qs.stringify(dataObj);
    const encRequest = encrypt(data, working_key);

    const paymentUrl =
      CCAV_ENV === "PROD"
        ? "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction"
        : "https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction";

    global.paymentStore[order_id] = { status: "PENDING", createdAt: Date.now(), amount };

    return res.json({
      success: true,
      url: paymentUrl,
      encRequest,
      access_code,
      order_id,
    });
  } catch (err) {
    console.error("❌ Initiate error:", err);
    return res.status(500).json({ success: false, error: "Payment initiation failed" });
  }
});

/* ===============================
   Handle CCAvenue response
   =============================== */
router.post("/response", async (req, res) => {
  try {
    const encResp = req.body.encResp;
    if (!encResp) return res.status(400).json({ success: false, error: "No encResp" });

    const decrypted = decrypt(encResp, working_key);
    console.log("✅ CCAvenue Decrypted Response:", decrypted);

    const parsed = qs.parse(decrypted);

    if (!parsed.order_id) return res.status(400).json({ success: false, error: "Invalid response" });

    // Prepare payment data to store in Firestore
    const paymentData = {
      order_id: parsed.order_id,
      tracking_id: parsed.tracking_id || null,
      amount: parsed.amount || null,
      payment_status: parsed.order_status,
      billing_name: parsed.billing_name || null,
      billing_email: parsed.billing_email || null,
      billing_tel: parsed.billing_tel || null,
      bank_ref_no: parsed.bank_ref_no || null,
      currency: parsed.currency || "INR",
      createdAt: new Date(),
      raw: parsed,
    };

    // Write to Firestore
    await db.collection("payments").doc(parsed.order_id).set(paymentData);

    // Update in-memory store
    global.paymentStore[parsed.order_id] = {
      status: parsed.order_status === "Success" ? "PAID" : "FAILED",
      ...paymentData,
      verifiedAt: Date.now(),
    };

    // Redirect frontend to success page with order_id
    const redirectUrl =
      parsed.order_status === "Success"
        ? `https://kirdana.net/payment-success?order_id=${parsed.order_id}`
        : `https://kirdana.net/payment-failed?order_id=${parsed.order_id}`;

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("❌ CCAvenue Response Error:", err);
    return res.status(500).json({ success: false, error: "Decrypt or store failed" });
  }
});

/* ===============================
   Verify payment
   =============================== */
router.get("/verify/:orderId", (req, res) => {
  try {
    const { orderId } = req.params;

    if (!global.paymentStore || !global.paymentStore[orderId])
      return res.json({ success: false, status: "PENDING" });

    const payment = global.paymentStore[orderId];

    return res.json({
      success: payment.status === "PAID",
      status: payment.status,
      paymentId: payment.paymentId,
      amount: payment.amount,
    });
  } catch (err) {
    console.error("❌ Verify error:", err);
    return res.status(500).json({ success: false, status: "ERROR" });
  }
});

/* ===============================
   Handle payment cancel
   =============================== */
router.post("/cancel", (req, res) => {
  return res.json({ success: false, status: "CANCELLED" });
});

module.exports = router;
