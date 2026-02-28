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
   ⚠️ Replace with DB/Redis in production
   =============================== */
global.paymentStore = global.paymentStore || {};

/* ===============================
   Initiate payment
   =============================== */
router.post("/initiate", (req, res) => {
  try {
    const { amount, order_id, customer } = req.body;

    if (!amount || !order_id || !customer?.email) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // ✅ Must be CCAvenue registered domain
    const redirect_url =
      "https://backendpayments.onrender.com/api/ccav/response";
    const cancel_url = "https://backendpayments.onrender.com/api/ccav/cancel";
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

    // ✅ URL encoded string (MANDATORY for CCAvenue)
    const data = qs.stringify(dataObj);

    const encRequest = encrypt(data, working_key);

    const paymentUrl =
      CCAV_ENV === "PROD"
        ? "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction"
        : "https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction";

    // Store as pending
    global.paymentStore[order_id] = {
      status: "PENDING",
      createdAt: Date.now(),
      amount,
    };

    return res.json({
      success: true,
      url: paymentUrl,
      encRequest,
      access_code,
      order_id,
    });
  } catch (err) {
    console.error("❌ Initiate error:", err);
    return res.status(500).json({
      success: false,
      error: "Payment initiation failed",
    });
  }
});

/* ===============================
   Handle CCAvenue response (SERVER-SIDE)
   =============================== */
/* ===============================
   Handle CCAvenue response (SERVER-SIDE)
   =============================== */
router.post("/response", (req, res) => {
  try {
    const encResp = req.body.encResp;
    if (!encResp) return res.status(400).send("No encResp");

    // ✅ Add .trim() here to remove any extra whitespace/newlines
    const decrypted = decrypt(encResp.trim(), working_key);

    const parsed = qs.parse(decrypted);

    if (!parsed.order_id) return res.status(400).send("Invalid response");

    // Save status in memory store
    if (parsed.order_status === "Success") {
      global.paymentStore[parsed.order_id] = {
        status: "PAID",
        paymentId: parsed.tracking_id,
        amount: parsed.amount,
        raw: parsed,
        verifiedAt: Date.now(),
      };
    } else {
      global.paymentStore[parsed.order_id] = {
        status: "FAILED",
        raw: parsed,
        verifiedAt: Date.now(),
      };
    }

    // Redirect to frontend success page
    const frontendUrl = `https://kridana.net/payment-success?orderId=${parsed.order_id}`;
    return res.redirect(frontendUrl);
  } catch (err) {
    console.error("CCAvenue Response Error:", err);
    return res.status(500).send("Decrypt failed");
  }
});

/* ===============================
   Verify Payment Status API
   =============================== */
/* ===============================
   Verify payment
   =============================== */
/* ===============================
   Verify Payment Status API
   =============================== */
router.get("/verify/:orderId", (req, res) => {
  try {
    const { orderId } = req.params;
    if (!global.paymentStore) global.paymentStore = {};

    const payment = global.paymentStore[orderId];

    if (!payment) {
      return res.json({ success: false, status: "PENDING" });
    }

    return res.json({
      success: payment.status === "PAID",
      status: payment.status,
      paymentId: payment.paymentId || null,
      amount: payment.amount || null,
    });
  } catch (err) {
    console.error("❌ Verify error:", err);
    return res.json({ success: false, status: "ERROR" });
  }
});

/* ===============================
   Handle payment cancel
   =============================== */
router.post("/cancel", (req, res) => {
  return res.json({
    success: false,
    status: "CANCELLED",
  });
});

module.exports = router;
