import Newsletter from '../models/Newsletter.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Helper function to send confirmation email
const sendConfirmationEmail = async (email, firstName) => {
  const name = firstName || 'there';
  
  try {
    console.log('Attempting to send email with user:', process.env.EMAIL_USER);
    
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
            <p>If you did not subscribe to this newsletter, please <a href="${process.env.FRONTEND_URL}/unsubscribe?email=${email}" style="color: #0066cc;">click here to unsubscribe</a>.</p>
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
    if (error.code === 'EAUTH') {
      console.error('Authentication error - check your email credentials');
    }
    return false;
  }
};

// Subscribe to newsletter
export const subscribe = async (req, res) => {
  try {
    console.log('Newsletter subscription request received:', req.body);
    
    const { email, firstName, lastName, interests, frequency } = req.body;

    // Validate required fields
    if (!email) {
      console.log('Missing email in request');
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Check if email already exists
    const existingSubscription = await Newsletter.findOne({ email });
    if (existingSubscription) {
      console.log('Email already subscribed:', email);
      return res.status(400).json({
        success: false,
        message: 'This email is already subscribed to our newsletter'
      });
    }

    // Create new newsletter subscription
    const newsletter = new Newsletter({ 
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      interests: interests || [],
      frequency: frequency || 'weekly',
      isActive: true,
      subscribedAt: new Date()
    });

    const savedNewsletter = await newsletter.save();
    console.log('Newsletter subscription saved:', savedNewsletter._id);

    // Send confirmation email (don't wait for it to complete)
    sendConfirmationEmail(email, firstName).catch(error => {
      console.error('Failed to send confirmation email, but subscription was successful:', error);
    });

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter! Please check your email for confirmation.',
      data: {
        id: savedNewsletter._id,
        email: savedNewsletter.email
      }
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This email is already subscribed to our newsletter'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all subscriptions (Admin only)
export const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Newsletter.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: subscriptions,
      total: subscriptions.length
    });
  } catch (error) {
    console.error('Error getting newsletter subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving newsletter subscriptions'
    });
  }
};

// Delete newsletter subscription (Admin only)
export const deleteNewsletter = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Newsletter.findByIdAndDelete(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Newsletter subscription not found'
      });
    }
    
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

// Unsubscribe from newsletter (Public)
export const unsubscribe = async (req, res) => {
  try {
    const { email } = req.params;
    
    const result = await Newsletter.findOneAndUpdate(
      { email },
      { isActive: false, unsubscribedAt: new Date() },
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