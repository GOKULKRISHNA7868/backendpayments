const express = require("express");
const router = express.Router();
const { encrypt, decrypt } = require("../utils/crypto");

router.post("/initiate", (req, res) => {
  const { amount, order_id, customer } = req.body;

  const merchant_id = process.env.CCAV_MERCHANT_ID;
  const access_code = process.env.CCAV_ACCESS_CODE;
  const working_key = process.env.CCAV_WORKING_KEY;

  const redirect_url = `${process.env.FRONTEND_URL}/payment-success`;
  const cancel_url = `${process.env.FRONTEND_URL}/payment-failed`;

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

router.post(
  "/response",
  express.urlencoded({ extended: false }),
  (req, res) => {
    const encResp = req.body.encResp;
    const working_key = process.env.CCAV_WORKING_KEY;

    const decrypted = decrypt(encResp, working_key);

    res.redirect(
      `${process.env.FRONTEND_URL}/payment-success?data=${encodeURIComponent(decrypted)}`,
    );
  },
);

router.post("/cancel", (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/payment-failed`);
});

module.exports = router;
