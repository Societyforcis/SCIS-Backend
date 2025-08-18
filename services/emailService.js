import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import Newsletter from '../models/Newsletter.js';
import UserSettings from '../models/UserSettings.js';
import User from '../models/User.js';

dotenv.config();

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS  // Changed from EMAIL_PASSWORD to EMAIL_PASS to match your .env file
  }
});

// Test the connection
transporter.verify((error) => {
  if (error) {
    console.error('Email service error:', error);
  } else {
    console.log('Email service is ready to send messages');
  }
});

/**
 * Send announcement email to a specific user
 * @param {string} userId - User ID
 * @param {Object} notification - Notification object
 * @returns {Promise} - Nodemailer response
 */
export const sendAnnouncementEmailToUser = async (userId, notification) => {
  try {
    // Check if the user has email notifications enabled
    const hasEnabled = await hasEmailNotificationsEnabled(userId);
    if (!hasEnabled) {
      console.log(`User ${userId} has disabled email notifications`);
      return null;
    }
    
    // Get user email
    const user = await User.findById(userId).select('email firstName lastName');
    if (!user || !user.email) {
      console.log(`No valid email found for user ${userId}`);
      return null;
    }
    
    // Generate the HTML content with the provided image
    const htmlContent = generateAnnouncementEmailTemplate({
      title: notification.title,
      message: notification.message,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      imageBase64: notification.image,
      imageType: notification.imageType,
      link: notification.link || process.env.FRONTEND_URL || 'https://cybersociety.org',
      notificationType: notification.type
    });
    
    // Send the email
    const mailOptions = {
      from: `"Society for CIS" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `${notification.type === 'event' ? 'Event:' : 'Announcement:'} ${notification.title}`,
      html: htmlContent
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${user.email}: ${info.messageId}`);
    return info;
    
  } catch (error) {
    console.error(`Error sending email to user ${userId}:`, error);
    throw error;
  }
};

/**
 * Send announcement email to all users who have enabled email notifications
 * @param {Object} notification - Notification object
 * @returns {Promise} - Array of nodemailer responses
 */
export const sendAnnouncementEmail = async (notification) => {
  try {
    // Get users who have email notifications enabled
    const usersWithEmailEnabled = await UserSettings.find({ 
      emailNotifications: true 
    }).populate('userId', 'email firstName lastName');

    const emailPromises = usersWithEmailEnabled.map(async (userSettings) => {
      if (userSettings.userId && userSettings.userId.email) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: userSettings.userId.email,
          subject: notification.title,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>${notification.title}</h2>
              <p>${notification.message}</p>
              ${notification.link ? `<p><a href="${notification.link}">Read More</a></p>` : ''}
              <hr>
              <p><small>This email was sent by Society for Cyber Intelligent Systems</small></p>
            </div>
          `
        };

        return transporter.sendMail(mailOptions);
      }
    });

    await Promise.all(emailPromises.filter(Boolean));
    console.log('Announcement emails sent successfully');
  } catch (error) {
    console.error('Error sending announcement emails:', error);
    throw error;
  }
};

/**
 * Generate a responsive HTML email template for announcements
 * @param {Object} options - Template options
 * @returns {string} - HTML template
 */
const generateAnnouncementEmailTemplate = ({ title, message, firstName, lastName, imageBase64, imageType, link, notificationType }) => {
  const name = firstName && lastName ? `${firstName} ${lastName}` : firstName || 'Member';
  const imageTag = imageBase64 && imageType ? 
    `<img src="data:${imageType};base64,${imageBase64}" alt="${title}" style="max-width: 100%; height: auto; margin: 20px 0; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">` : '';
  
  // Create banner/header based on notification type
  const bannerColor = notificationType === 'event' ? '#4B70E2' : '#DB4437';
  const iconType = notificationType === 'event' ? 'calendar-event' : 'announcement';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .header {
          background: linear-gradient(135deg, ${bannerColor} 0%, #c62828 100%);
          color: #ffffff;
          padding: 20px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .header p {
          margin: 5px 0 0;
          font-size: 14px;
          opacity: 0.9;
        }
        .content {
          padding: 30px;
        }
        .greeting {
          font-size: 18px;
          margin-bottom: 20px;
        }
        .message {
          font-size: 16px;
          margin-bottom: 25px;
          line-height: 1.7;
        }
        .action-button {
          display: inline-block;
          background-color: ${bannerColor};
          color: #ffffff !important;
          text-decoration: none;
          padding: 12px 25px;
          border-radius: 5px;
          font-weight: bold;
          margin-top: 15px;
          text-align: center;
          transition: background-color 0.3s;
        }
        .action-button:hover {
          background-color: #c62828;
        }
        .footer {
          background-color: #f5f5f5;
          padding: 20px 30px;
          text-align: center;
          font-size: 12px;
          color: #777;
        }
        .footer a {
          color: ${bannerColor};
          text-decoration: none;
        }
        .social-links {
          margin-top: 15px;
        }
        .social-links a {
          display: inline-block;
          margin: 0 8px;
          color: #777;
          text-decoration: none;
        }
        .type-icon {
          font-size: 36px;
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="type-icon">
            ${notificationType === 'event' ? '📅' : '📢'}
          </div>
          <h1>${title}</h1>
          <p>${notificationType === 'event' ? 'Event Announcement' : 'Important Announcement'}</p>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name},</div>
          <div class="message">
            ${message.replace(/\n/g, '<br>')}
          </div>
          ${imageTag}
          <a href="${link}" class="action-button">View ${notificationType === 'event' ? 'Event' : 'Announcement'}</a>
        </div>
        <div class="footer">
          <p>This email was sent to you because you've enabled email notifications in your Society for CIS account settings.</p>
          <p>If you no longer wish to receive these emails, you can <a href="${process.env.FRONTEND_URL}/settings">update your notification preferences</a>.</p>
          <div class="social-links">
            <a href="#">Twitter</a> • <a href="#">Facebook</a> • <a href="#">LinkedIn</a> • <a href="#">Instagram</a>
          </div>
          <p>© ${new Date().getFullYear()} Society for CIS. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export default transporter;