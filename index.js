// import express from "express";
// import dotenv from "dotenv";
// import nodemailer from "nodemailer";
// dotenv.config();
// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());
// app.set("view engine", "ejs");

// app.get("/", (req, res) => {
//   res.render("form");
// });

// // 2. Add the POST route to handle form submission
// app.post("/send-email", async (req, res) => {
//   const { to, subject, message } = req.body;

//   // Configure the SMTP transporter
//   const transporter = nodemailer.createTransport({
//     host: "smtp.gmail.com", // Fixed: Changed from "://gmail.com"
//     port: 465,
//     secure: true, // true for port 465
//     auth: {
//       user: process.env.SMTP_EMAIL_USER,
//       pass: process.env.SMTP_EMAIL_PASS,
//     },
//   });

//   // Setup the email configuration using form data
//   const mailOptions = {
//     from: `"Email Sender App" <${process.env.SMTP_EMAIL_USER}>`,
//     to: to,
//     subject: subject,
//     text: message, // Plain text body from your textarea
//     html: `<p>${message.replace(/\n/g, "<br>")}</p>`, // Simple HTML conversion for line breaks
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//     // Redirect to your home page layout on success
//     res.render("home");
//   } catch (error) {
//     console.error("Email delivery failed:", error);
//     res.status(500).send("Failed to send email. Check server logs.");
//   }
// });

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

// Email Sender with OTP Verification System

import express from "express";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");

// Temporary in-memory store for OTPs (wipes on server restart)
const otpStore = new Map();

// Helper: Generate a random 6-digit numeric OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 1. Initial Landing Page: Render the email form
app.get("/", (req, res) => {
  res.render("form");
});

// 2. Handle form submission, generate OTP, and send email
app.post("/send-email", async (req, res) => {
  const { to } = req.body; // We only need the target email address now

  if (!to) {
    return res.status(400).send("Email address is required.");
  }

  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // Code expires in 5 minutes

  // Store the OTP and expiration timestamp tied to the user's email
  otpStore.set(to, { otp, expiresAt });

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_EMAIL_USER,
      pass: process.env.SMTP_EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Verification System" <${process.env.SMTP_EMAIL_USER}>`,
    to: to,
    subject: "Your 6-Digit Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; max-width: 500px; margin: auto;">
        <h2 style="color: #333;"><span style="color: #007bff;">OFONTECH</span> Email Verification</h2>
        <p>Please use the following single-use verification code to complete your validation:</p>
        <h1 style="background: #f4f4f4; padding: 15px; text-align: center; letter-spacing: 8px; color: #007bff; border-radius: 4px;">${otp}</h1>
        <p style="color: #666; font-size: 13px;">This code is strictly valid for <strong>5 minutes</strong>. If you did not request this, please disregard this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    // Render the verification entry screen and pass the email down to it
    res.render("verify", { email: to, errorMessage: null });
  } catch (error) {
    console.error("Email delivery failed:", error);
    res
      .status(500)
      .send("Failed to send verification code. Check server logs.");
  }
});

// 3. Handle validation of the submitted OTP code
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);

  if (!record) {
    return res.render("verify", {
      email,
      errorMessage:
        "No verification process found for this email. Please try again.",
    });
  }

  // Check if token has run past its 5-minute lifespan
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email); // Clean up expired data
    return res.render("verify", {
      email,
      errorMessage:
        "Your verification code has expired. Please request a new one.",
    });
  }

  // Check if user input matches saved OTP code
  if (record.otp !== otp) {
    return res.render("verify", {
      email,
      errorMessage: "Invalid code. Please double-check and try again.",
    });
  }

  // Success: Clear token from cache memory and proceed to landing welcome page
  otpStore.delete(email);
  res.render("home");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
