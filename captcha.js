const express = require("express");
const router = express.Router();
const fetch = require('node-fetch');


router.post("/verify", async (req, res) => {
  const { token } = req.body;

  const googleUrl = "https://www.google.com/recaptcha/api/siteverify";
  const secretKey = process.env.CAPTCHA_SECRET_KEY;

  try {
    const response = await fetch(googleUrl, {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();

    console.log(data);
if (data.success) {
  res.json({ success: true });
} else {
  res.json({ success: false, errors: data["error-codes"] });
}

  } catch (error) {
    console.error("Error verifying reCAPTCHA", error);
    res.json({ success: false });
  }
});

module.exports = router;
