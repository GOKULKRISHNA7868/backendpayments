const express = require("express");
const router = express.Router();
const { encrypt, decrypt } = require("../utils/crypto");
const qs = require("querystring");

/* ===============================
   🔐 CCAvenue PROD Credentials
   =============================== */
const merchant_id = "4423673";
const access_code = "AVJW88NB21AL14WJLA";
const working_key = "4CE2CC6602914AD1FA96DF7457299700";
const CCAV_ENV = "PROD";

/* ===============================
   In-memory payment store
   =============================== */
global.paymentStore = global.paymentStore || {};

/* ===============================
   Initiate payment
   =============================== */
router.post("/initiate", (req, res) => {
  try {
    const { amount, order_id, customer } = req.body;
    if (!amount || !order_id || !customer?.email)
      return res.status(400).json({ success: false, error: "Missing required fields" });

    const redirect_url = "https://kridana.net/api/payment/response"; // server endpoint
    const cancel_url = "https://kridana.net/api/payment/cancel";

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

    // Store in-memory only
    global.paymentStore[order_id] = { status: "PENDING", createdAt: Date.now(), amount, customer };

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
router.post("/response", (req, res) => {
  try {
    const encResp = req.body.encResp;
    if (!encResp) return res.status(400).json({ success: false, error: "No encResp" });

    const decrypted = decrypt(encResp, working_key);
    console.log("✅ CCAvenue Decrypted Response:", decrypted);

    const parsed = qs.parse(decrypted);
    if (!parsed.order_id) return res.status(400).json({ success: false, error: "Invalid response" });

    // Update in-memory store
    global.paymentStore[parsed.order_id] = {
      status: parsed.order_status === "Success" ? "PAID" : "FAILED",
      ...parsed,
      verifiedAt: Date.now(),
    };

    // Redirect user to frontend success page
    const redirectUrl =
      parsed.order_status === "Success"
        ? `https://kridana.net/payment-success?order_id=${parsed.order_id}`
        : `https://kridana.net/payment-failed?order_id=${parsed.order_id}`;

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("❌ CCAvenue Response Error:", err);
    return res.status(500).json({ success: false, error: "Decrypt failed" });
  }
});

/* ===============================
   Get payment details (for frontend PaymentSuccess.jsx)
   =============================== */
router.get("/details/:orderId", (req, res) => {
  const { orderId } = req.params;
  if (!global.paymentStore[orderId])
    return res.status(404).json({ success: false, error: "Payment not found" });

  return res.json({ success: true, payment: global.paymentStore[orderId] });
});

/* ===============================
   Handle payment cancel
   =============================== */
router.post("/cancel", (req, res) => {
  return res.json({ success: false, status: "CANCELLED" });
});

module.exports = router;
