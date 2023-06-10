const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');


require('dotenv').config();


// ADD RATE LIMITING ALSO
const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS for cross-domain requests

const limiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    max: 5, // Maximum number of requests per windowMs
    keyGenerator: (req) => req.ip,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests from this IP, please try again after 24 hours.',
  });
  
  app.use(limiter);
  
// Define a route to handle the email sending

app.post('/', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Invalid email address'),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { name, email, message } = req.body;
  

  // Create a Nodemailer transporter
  const transporter = nodemailer.createTransport({
    // Configure your email provider details here
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Compose the email message
  const mailOptions = {
    from: email, // Sender's email address (user input)
    to: process.env.EMAIL_RECIPIENT, // Your email address
    subject: 'New Portfolio Form Submission',
    text: `Name: ${name}\nEmail: ${email}\n\nMessage: ${message}`,
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      res.status(500).send('Failed to send email.'); // Handle the error
    } else {
      console.log('Email sent:', info.response);
      res.sendStatus(200); // Send a success response
    }
  });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
