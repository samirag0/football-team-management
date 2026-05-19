const nodemailer = require("nodemailer");

// Configure Nodemailer transporter using Gmail authentication
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send newly created user credentials via email
exports.sendUserCredentials = async (email, username, password, role) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Club System Account",
    html: `
      <h2>Football Manager System</h2>
      <p>Your account has been created.</p>

      <p><strong>Username:</strong> ${username}</p>
      <p><strong>Password:</strong> ${password}</p>
      <p><strong>Role:</strong> ${role}</p>

      <p>You can now log into the Club System.</p>
    `,
  };

  // Send email containing temporary login credentials
  await transporter.sendMail(mailOptions);
};