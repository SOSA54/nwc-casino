const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // Your email service (e.g., Gmail, Outlook)
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASSWORD // Your email password or app-specific password
    }
});

function sendVerificationEmail(recipientEmail, verificationLink) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: 'Email Verification',
        html: `<p>Please verify your email by clicking on the link below:</p><p><a href="${verificationLink}">${verificationLink}</a></p>`
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

module.exports = { sendVerificationEmail };