const express = require("express");
const router = express.Router();
const { encrypt, decrypt } = require("../utils/crypto");

// Initiate payment
router.post("/initiate", (req, res) => {
  const { amount, order_id, customer } = req.body;

  const merchant_id = process.env.CCAV_MERCHANT_ID;
  const access_code = process.env.CCAV_ACCESS_CODE;
  const working_key = process.env.CCAV_WORKING_KEY;

  // Use the CCAvenue registered domain
  const redirect_url = `https://kirdana.net/payment`;
  const cancel_url = `https://kirdana.net/payment-failed`;

  const data = `merchant_id=${merchant_id}&order_id=${order_id}&amount=${amount}&currency=INR&redirect_url=${redirect_url}&cancel_url=${cancel_url}&billing_name=${customer.name}&billing_email=${customer.email}&billing_tel=${customer.phone}`;

  const encRequest = encrypt(data, working_key);

  const paymentUrl =
    process.env.CCAV_ENV === "PROD"
      ? "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction"
      : "https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction";

  res.json({
    url: paymentUrl,
    encRequest,
    access_code,
  });
});

// Handle CCAvenue response
router.post(
  "/response",
  express.urlencoded({ extended: false }),
  (req, res) => {
    const encResp = req.body.encResp;
    const working_key = process.env.CCAV_WORKING_KEY;

    try {
      const decrypted = decrypt(encResp, working_key);
      // Redirect to frontend success page with decoded data
      res.redirect(
        `https://kirdana.net/payment-success?data=${encodeURIComponent(decrypted)}`,
      );
    } catch (err) {
      console.error("CCAvenue Response Decrypt Error:", err);
      // Redirect to failure page on error
      res.redirect("https://kirdana.net/payment-failed");
    }
  },
);

// Handle payment cancel
router.post("/cancel", (req, res) => {
  res.redirect("https://kirdana.net/payment-failed");
});

module.exports = router;
