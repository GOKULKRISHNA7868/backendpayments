const express = require("express");
const router = express.Router();
const { encrypt, decrypt } = require("../utils/crypto");
const qs = require("querystring");

/* ===============================
   🔐 CCAvenue PROD Credentials
   =============================== */

const merchant_id = "4423673";
const access_code = "AVRZ88NB50BI97ZRIB";
const working_key = "Y12E1987827A3A9099F4791A84AB6CDF2";
const CCAV_ENV = "PROD";

/* ===============================
   Initiate payment
   =============================== */
router.post("/initiate", (req, res) => {
  const { amount, order_id, customer } = req.body;

  // ✅ Must be CCAvenue registered domain
  const redirect_url = "https://kirdana.net/payment-success";
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

  res.json({
    url: paymentUrl,
    encRequest,
    access_code,
  });
});

/* ===============================
   Handle CCAvenue response
   =============================== */
router.post("/response", (req, res) => {
  const encResp = req.body.encResp;

  try {
    const decrypted = decrypt(encResp, working_key);

    console.log("✅ CCAvenue Decrypted Response:", decrypted);

    res.redirect(
      `https://kirdana.net/payment-success?data=${encodeURIComponent(decrypted)}`,
    );
  } catch (err) {
    console.error("❌ CCAvenue Response Decrypt Error:", err);
    res.redirect("https://kirdana.net/payment-failed");
  }
});

/* ===============================
   Handle payment cancel
   =============================== */
router.post("/cancel", (req, res) => {
  res.redirect("https://kirdana.net/payment-failed");
});

module.exports = router;
