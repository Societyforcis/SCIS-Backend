import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export const sendVerificationEmail = async (email, token) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Email Verification",
        html: `
            <h2>Thank you for registering!</h2>
            <p>Please verify your email by clicking on the link below:</p>
            <a href="https://localhost:5173/verify-email?token=${token}">Verify Email</a>
            <p>This link will expire in 24 hours.</p>
        `
    };
    return transporter.sendMail(mailOptions);
};

export const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your One-Time Password (OTP)",
        html: `
            <p>Your OTP is: <strong style="font-size:20px">${otp}</strong></p>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't initiate this request, you can safely ignore this email.</p>
        `
    };
    return transporter.sendMail(mailOptions);
}; 