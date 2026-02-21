const express = require("express");
const router = express.Router();
const { encrypt, decrypt } = require("../utils/crypto");

/* ===============================
   🔐 CCAvenue TEST Credentials
   =============================== */

const merchant_id = "4423673"; // e.g. 123456
const access_code = "AVRZ88NB50BI97ZRIB"; // e.g. AVABCD12EFGH34
const working_key = "Y12E1987827A3A9099F4791A84AB6CDF2"; // 32 char key from CCAvenue
const CCAV_ENV = "TEST"; // change to "PROD" later

/* ===============================
   Initiate payment
   =============================== */
router.post("/initiate", (req, res) => {
  const { amount, order_id, customer } = req.body;

  // ✅ Must be CCAvenue registered domain
  const redirect_url = `https://kirdana.net/payment`;
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
  (req, res) => {
    const encResp = req.body.encResp;

    try {
      const decrypted = decrypt(encResp, working_key);

      console.log("✅ CCAvenue Decrypted Response:", decrypted);

      // Redirect to frontend success page
      res.redirect(
        `https://kirdana.net/payment-success?data=${encodeURIComponent(decrypted)}`,
      );
    } catch (err) {
      console.error("❌ CCAvenue Response Decrypt Error:", err);

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
