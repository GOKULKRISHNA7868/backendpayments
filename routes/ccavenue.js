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
   (⚠️ Replace with DB/Redis in prod)
   =============================== */
global.paymentStore = global.paymentStore || {};

/* ===============================
   Initiate payment
   =============================== */
router.post("/initiate", (req, res) => {
  const { amount, order_id, customer } = req.body;

  // ✅ Must be CCAvenue registered domain
  const redirect_url = "https://kirdana.net/api/payment/response";
  const cancel_url = "https://kirdana.net/api/payment/cancel";

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

  res.json({
    url: paymentUrl,
    encRequest,
    access_code,
    order_id,
  });
});

/* ===============================
   Handle CCAvenue response (SECURE)
   =============================== */
router.post("/response", async (req, res) => {
  const encResp = req.body.encResp;

  try {
    const decrypted = decrypt(encResp, working_key);
    console.log("✅ CCAvenue Decrypted Response:", decrypted);

    const parsed = qs.parse(decrypted);

    /*
      parsed.order_status
      parsed.order_id
      parsed.tracking_id
      parsed.payment_mode
      parsed.amount
    */

    if (parsed.order_status === "Success") {
      // ✅ Store securely server-side
      global.paymentStore[parsed.order_id] = {
        status: "PAID",
        paymentId: parsed.tracking_id,
        amount: parsed.amount,
        raw: parsed,
        verifiedAt: Date.now(),
      };

      // ❌ NO REDIRECT
      return res.json({
        success: true,
        status: "PAID",
        order_id: parsed.order_id,
      });
    } else {
      global.paymentStore[parsed.order_id] = {
        status: "FAILED",
        raw: parsed,
        verifiedAt: Date.now(),
      };

      return res.json({
        success: false,
        status: "FAILED",
        order_id: parsed.order_id,
      });
    }
  } catch (err) {
    console.error("❌ CCAvenue Response Decrypt Error:", err);
    return res.status(500).json({ success: false, error: "Decrypt failed" });
  }
});

/* ===============================
   Verify Payment Status API
   =============================== */
router.get("/verify/:orderId", (req, res) => {
  const { orderId } = req.params;

  const payment = global.paymentStore[orderId];

  if (!payment) {
    return res.json({
      success: false,
      status: "PENDING",
    });
  }

  if (payment.status === "PAID") {
    return res.json({
      success: true,
      status: "PAID",
      paymentId: payment.paymentId,
      amount: payment.amount,
    });
  }

  if (payment.status === "FAILED") {
    return res.json({
      success: false,
      status: "FAILED",
    });
  }

  return res.json({
    success: false,
    status: "UNKNOWN",
  });
});

/* ===============================
   Handle payment cancel
   =============================== */
router.post("/cancel", (req, res) => {
  // ❌ No redirect
  return res.json({
    success: false,
    status: "CANCELLED",
  });
});

module.exports = router;
