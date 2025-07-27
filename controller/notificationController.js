import Notification from '../models/Notification.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { sendAnnouncementEmail, sendAnnouncementEmailToUser } from '../services/emailService.js';

// Helper function to process base64 image
const processImage = (base64String) => {
  if (!base64String) return { image: null, imageType: null };
  
  // Check if it's already in the expected format
  if (!base64String.includes(';base64,')) {
    return { image: base64String, imageType: null };
  }
  
  // Extract data from data URL
  const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return { image: null, imageType: null };
  }
  
  return {
    image: matches[2],
    imageType: matches[1]
  };
};

// Create a new notification
export const createNotification = async (req, res) => {
  try {
    const { 
      title, 
      message, 
      type = 'announcement', 
      recipients, 
      priority = 'medium', 
      link,
      image,
      imageType
    } = req.body;
    
    const createdBy = req.user?._id;

    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    // Determine if notification is for all users
    const isForAllUsers = recipients === 'all';
    
    // Prepare recipients array - empty if for all users
    let recipientsList = [];
    if (!isForAllUsers && recipients) {
      if (Array.isArray(recipients)) {
        recipientsList = recipients;
      } else if (mongoose.Types.ObjectId.isValid(recipients)) {
        recipientsList = [recipients];
      }
    }

    // Process the image data if provided
    let processedImage = null;
    let processedImageType = null;
    
    if (image && imageType) {
      processedImage = image;
      processedImageType = imageType;
      console.log(`Image included: ${imageType} (${Math.round(image.length / 1024)}KB)`);
    }

    const notificationData = {
      title,
      message,
      type,
      priority,
      link: link || '',
      recipients: recipientsList,
      isForAllUsers,
      createdBy,
      image: processedImage,
      imageType: processedImageType,
      readBy: [],
      viewedBy: []
    };

    console.log('Creating notification:', {
      ...notificationData,
      image: processedImage ? `[Base64 string: ${Math.round(processedImage.length / 1024)}KB]` : null
    });

    // Create the notification
    const notification = await Notification.create(notificationData);
    
    // If this is an announcement type notification, send emails
    if (type === 'announcement' || type === 'event') {
      console.log('Sending announcement emails...');
      
      // Schedule email sending in the background
      setImmediate(async () => {
        try {
          if (isForAllUsers) {
            // Send to all users except admins who have email notifications enabled
            await sendAnnouncementEmail(notification);
          } else if (recipientsList.length > 0) {
            // Send to specific recipients who have email notifications enabled
            await Promise.all(
              recipientsList.map(userId => 
                sendAnnouncementEmailToUser(userId, notification)
              )
            );
          }
        } catch (emailError) {
          console.error('Error sending announcement emails:', emailError);
        }
      });
    }
    
    // Return success response without waiting for emails to be sent
    res.status(201).json({
      success: true,
      data: {
        ...notification.toObject(),
        image: notification.image ? `[Base64 string: ${Math.round(notification.image.length / 1024)}KB]` : null
      },
      message: 'Notification created successfully'
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all notifications (for admin)
export const getAllNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find()
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .populate('createdBy', 'name email')
        .lean(),
      Notification.countDocuments()
    ]);

    // Add imageUrl to each notification
    const notificationsWithStats = notifications.map(notification => ({
      ...notification,
      imageUrl: notification.image ? `data:${notification.imageType};base64,${notification.image}` : null,
      readCount: notification.readBy?.length || 0,
      viewCount: notification.viewedBy?.length || 0
    }));

    res.json({
      success: true,
      data: notificationsWithStats,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting notifications'
    });
  }
};

// Get user's notifications
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    console.log(`Fetching notifications for user: ${userId}`);

    // Find notifications for this user (both specific and for all users)
    const notifications = await Notification.find({
      $or: [
        { isForAllUsers: true },
        { recipients: userId }
      ]
    })
    .sort({ createdAt: -1 })
    .lean();
    
    console.log(`Found ${notifications.length} notifications`);

    // Mark all fetched notifications as viewed by this user (not read yet)
    const notificationIds = notifications.map(n => n._id);
    if (notificationIds.length > 0) {
      await Notification.updateMany(
        { 
          _id: { $in: notificationIds },
          viewedBy: { $ne: userId }
        },
        { $addToSet: { viewedBy: userId } }
      );
    }
    
    // Process notifications to add read status
    const processedNotifications = notifications.map(notification => {
      // Check if this notification has been read by the user
      const isRead = notification.readBy?.some(id => 
        id.toString() === userId.toString()
      ) || false;
      
      // Create proper image URL if image exists
      let imageUrl = null;
      if (notification.image && notification.imageType) {
        imageUrl = `data:${notification.imageType};base64,${notification.image}`;
      }
      
      return {
        ...notification,
        read: isRead,
        imageUrl
      };
    });

    res.json({
      success: true,
      data: processedNotifications
    });
  } catch (error) {
    console.error('Error getting user notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user has already read this notification
    const alreadyRead = notification.readBy.some(readerId => 
      readerId.toString() === userId.toString()
    );
    
    if (!alreadyRead) {
      // Add user to readBy array
      notification.readBy.push(userId);
      
      // Ensure user is also in viewedBy array
      if (!notification.viewedBy.some(viewerId => viewerId.toString() === userId.toString())) {
        notification.viewedBy.push(userId);
      }
      
      await notification.save();
      
      console.log(`User ${userId} marked notification ${id} as read`);
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking notification as read'
    });
  }
};

// Mark all notifications as read for a user
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Find all notifications for this user that they haven't read yet
    const notifications = await Notification.find({
      $or: [
        { isForAllUsers: true },
        { recipients: userId }
      ],
      readBy: { $ne: userId } // Not already read by this user
    });

    // Add user ID to both readBy and viewedBy arrays for each notification
    const updatePromises = notifications.map(notification => {
      notification.readBy.push(userId);
      
      // Ensure user is also in viewedBy array
      if (!notification.viewedBy.some(viewerId => viewerId.toString() === userId.toString())) {
        notification.viewedBy.push(userId);
      }
      
      return notification.save();
    });
    
    await Promise.all(updatePromises);
    
    console.log(`User ${userId} marked all notifications as read`);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking all notifications as read'
    });
  }
};

// Get unread notification count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Use the static method we added to the Notification model
    const count = await Notification.countUnreadForUser(userId);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting unread count'
    });
  }
};

// Get notification stats for admin dashboard
export const getNotificationStats = async (req, res) => {
  try {
    const stats = await Notification.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          read: { $sum: { $size: '$readBy' } },
          viewed: { $sum: { $size: '$viewedBy' } },
          byType: {
            $push: { type: '$type', count: 1 }
          }
        }
      }
    ]);
    
    // Process type counts
    const typeStats = {};
    if (stats.length > 0 && stats[0].byType) {
      stats[0].byType.forEach(item => {
        if (!typeStats[item.type]) {
          typeStats[item.type] = 0;
        }
        typeStats[item.type] += item.count;
      });
    }
    
    res.json({
      success: true,
      data: {
        total: stats.length > 0 ? stats[0].total : 0,
        read: stats.length > 0 ? stats[0].read : 0,
        viewed: stats.length > 0 ? stats[0].viewed : 0,
        byType: typeStats
      }
    });
  } catch (error) {
    console.error('Error getting notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting notification stats'
    });
  }
};

// Delete notification (admin only)
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findByIdAndDelete(id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting notification'
    });
  }
};
