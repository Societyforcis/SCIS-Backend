import Newsletter from '../models/Newsletter.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // Changed from EMAIL_PASSWORD to EMAIL_PASS
  }
});

// Helper function to send confirmation email
const sendConfirmationEmail = async (email, firstName) => {
  const name = firstName || 'there'; // Default to 'there' if firstName is not provided
  
  try {
    console.log('Attempting to send email with credentials:', {
      service: process.env.EMAIL_SERVICE,
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS ? '****' : undefined // Log if password is defined without showing actual value
    });
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Society for Cyber Intelligent Systems Newsletter',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #333;">Thank You for Subscribing!</h1>
          </div>
          
          <div style="margin-bottom: 20px; color: #555;">
            <p>Hello ${name},</p>
            <p>Thank you for subscribing to the Society for Cyber Intelligent Systems newsletter. We're excited to have you join our community!</p>
            <p>You will now receive regular updates on:</p>
            <ul>
              <li>Latest research in cyber intelligent systems</li>
              <li>Upcoming events and conferences</li>
              <li>Educational resources and opportunities</li>
              <li>Community highlights and achievements</li>
            </ul>
            <p>Your subscription preferences have been saved, and we'll respect your communication choices.</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; color: #777; font-size: 12px;">
            <p>If you did not subscribe to this newsletter, please <a href="http://localhost:5000/api/newsletter/unsubscribe/${email}" style="color: #0066cc;">click here to unsubscribe</a>.</p>
            <p>&copy; ${new Date().getFullYear()} Society for Cyber Intelligent Systems. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Confirmation email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    // Additional error logging for debugging
    if (error.code === 'EAUTH') {
      console.error('Authentication error - check your email credentials');
    }
    return false;
  }
};

// Subscribe to newsletter
export const subscribe = async (req, res) => {
  try {
    const { email, firstName, lastName, interests, frequency } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const existingSubscription = await Newsletter.findOne({ email });
    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'Email already subscribed'
      });
    }

    const newsletter = new Newsletter({ 
      email,
      firstName,
      lastName,
      interests,
      frequency: frequency || 'weekly'
    });
    await newsletter.save();

    // Send confirmation email
    await sendConfirmationEmail(email, firstName);

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter'
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error subscribing to newsletter'
    });
  }
};

// Get all subscriptions
export const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Newsletter.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('Error getting newsletter subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving newsletter subscriptions'
    });
  }
};

// Delete newsletter subscription
export const deleteNewsletter = async (req, res) => {
  try {
    const { id } = req.params;
    await Newsletter.findByIdAndDelete(id);
    res.json({
      success: true,
      message: 'Newsletter subscription deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting newsletter subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting newsletter subscription'
    });
  }
};

// Unsubscribe from newsletter
export const unsubscribe = async (req, res) => {
  try {
    const { email } = req.params;
    
    const result = await Newsletter.findOneAndUpdate(
      { email },
      { isActive: false },
      { new: true }
    );
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    });
  } catch (error) {
    console.error('Error unsubscribing from newsletter:', error);
    res.status(500).json({
      success: false,
      message: 'Error unsubscribing from newsletter'
    });
  }
};