const express = require('express');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const Queue = require('bull');
const nodemailer = require('nodemailer');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 24 hours.',
});

app.use(limiter);

// Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Create a Bull queue instance
const emailQueue = new Queue('email');

// Define a route to handle the email sending
app.post(
  '/',
  [
    body().isArray().withMessage('Invalid email data'),
    body('*').isObject().notEmpty().withMessage('Email data is required'),
    body('*.name').trim().notEmpty().withMessage('Name is required'),
    body('*.email').trim().isEmail().withMessage('Invalid email address'),
    body('*.message').trim().notEmpty().withMessage('Message is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const emails = req.body;

    try {
        // Enqueue the email sending task for each email
        const tasks = emails.map((emailData) => {
          const { name, email: emailAddress, message } = emailData;
          return emailQueue.add('sendEmail', { name, email: emailAddress, message });
        });

      await Promise.all(tasks);

      console.log('Email tasks enqueued');
      res.sendStatus(200);
    } catch (error) {
      console.log(error);
      res.status(500).send('Failed to enqueue email tasks.');
    }
  }
);

// Define the email sending task handler
emailQueue.process('sendEmail', async (job) => {
  const { name, email, message } = job.data;

  // Compose the email message
  const mailOptions = {
    from: email,
    to: process.env.EMAIL_RECIPIENT,
    subject: 'New Portfolio Form Submission',
    text: `Name: ${name}\nEmail: ${email}\n\nMessage: ${message}`,
  };

  try {
    // Send the email asynchronously
    await transporter.sendMail(mailOptions);
    console.log('Email sent');
  } catch (error) {
    console.log(error);
    throw new Error('Failed to send email.');
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
