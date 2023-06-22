const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const twilio = require('twilio');
const mysql = require('mysql');
const cronjob = require('node-cron');
const ping = require('ping');
import fetch from 'node-fetch';


require('dotenv').config();


const app = express();
app.use(cors()); // Enable CORS for cross-domain requests
app.use(express.json());


  
  app.use(limiter);
  
 // Create a Nodemailer transporter
 const transporter = nodemailer.createTransport({
    // Configure your email provider details here
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });


  // Create a Twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Create a MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
 
// Recursive function to attempt to send 5 times 
const sendEmail = async (mailOptions, email, retries = 0) => {
    try {
      await transporter.sendMail(mailOptions);
      console.log('Email sent');
    } catch (error) {
      console.log('*** ERROR ***', error?.message);
      if (retries < 5) {
        const fiveSecondsToTwentySecondsInMilliSeconds = getRandomInt(5000, 20000);
      // Wait for the delay
        await wait(fiveSecondsToTwentySecondsInMilliSeconds);
        // make recursive call to sendEmail
        return sendEmail(mailOptions, email, retries + 1);
      } else {
        // Send SMS notification
        const smsMessage = `Hey Adam, someone just failed sending an email to you after 5 attempts. Email: ${email}. Check your database to see more information.`;
        sendSMS(smsMessage);
        // Store email in the database
        saveEmailToDatabase(mailOptions);
      }
    }
  };

  const sendSMS = async (message) => {
    try {
      await twilioClient.messages.create({
        body: message,
        to: process.env.OWN_MOBILE_NUMBER,
        from: process.env.TWILIO_MOBILE_NUMBER,
      });
      console.log('SMS sent');
    } catch (error) {
      console.log('sendSMS Error', error.message);
      throw error;
    }
  };

  const saveEmailToDatabase = (mailOptions) => {
    const { from, text } = mailOptions;
  
    const email = {
      sender_email: from,
      message: text,
    };
  
    pool.query('INSERT INTO emails SET ?', email, (error) => {
      if (error) {
        console.log('Failed to save email to database:', error);
      } else {
        console.log('Email saved to database');
      }
    });
  };

  // Define a route to handle the email sending
  app.post('/', [
      body('name').trim().notEmpty().withMessage('Name is required'),
      body('email').trim().isEmail().withMessage('Invalid email address'),
      body('message').trim().notEmpty().withMessage('Message is required'),
    ], async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
    
      const { name, email, message } = req.body;
    
      // Compose the email message
      const mailOptions = {
        from: email,
        to: process.env.EMAIL_RECIPIENT,
        subject: 'New Portfolio Form Submission',
        text: `Name: ${name}\nEmail: ${email}\n\nMessage: ${message}`,
      };
  
      res.sendStatus(200);
    
      try {
        // Send the email asynchronously
        await sendEmail(mailOptions, email);
      } catch (error) {
        console.log(error);
        res.status(500).send('Failed to send email.');
      }
    });
  

// Define a route for the cron job
app.get('/cron-job-route', (req, res) => {
    // Handle the cron job logic here
    const serverUrl = 'https://portfolio-backend-3jb1.onrender.com';
    ping.sys.probe(serverUrl, (isAlive) => {
      if (isAlive) {
        console.log(`Server ${serverUrl} is alive.`);
      } else {
        console.log(`Server ${serverUrl} is down.`);
      }
    });
    res.sendStatus(200);
  });

// Create a rate limiter
const limiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  max: 5, // Maximum number of requests per windowMs
  keyGenerator: (req) => req.ip,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 24 hours.',
});

// Apply the rate limiter to all routes except the cron job route
app.use((req, res, next) => {
  if (req.path === '/cron-job-route') {
    next();
  } else {
    limiter(req, res, next);
  }
});

// Schedule the cron job to run every 10 minutes
cronjob.schedule('*/10 * * * *', () => {
    // Send a GET request to the cron job route to execute the logic
    const cronJobUrl = 'https://portfolio-backend-3jb1.onrender.com/cron-job-route';
  
    fetch(cronJobUrl)
      .then((response) => {
        if (response.ok) {
          console.log('Cron job executed successfully.');
        } else {
          throw new Error('Request failed with status code ' + response.status);
        }
      })
      .catch((error) => {
        console.log('Error executing cron job:', error.message);
      });
  });
  


// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});