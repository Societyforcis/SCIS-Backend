import Membership from '../models/Membership.js';
import Profile from '../models/Profile.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Newsletter from '../models/Newsletter.js';
import { sendAnnouncementEmail } from '../services/emailService.js';

// User Controllers
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').lean();
    
    res.status(200).json({
      success: true,
      users: users,
      total: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Prevent deletion of primary admin
    if (user.email === 'societyforcis.org@gmail.com') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete the primary admin account.' 
      });
    }

    await User.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
};

// Membership Controllers
export const getAllMemberships = async (req, res) => {
  try {
    const memberships = await Membership.find()
      .sort('-createdAt')
      .select('-__v');

    res.json({
      success: true,
      memberships,
      total: memberships.length
    });
  } catch (error) {
    console.error('Error fetching memberships:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching memberships'
    });
  }
};

export const getMembershipById = async (req, res) => {
  try {
    const membership = await Membership.findById(req.params.id);
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Membership not found'
      });
    }
    res.json({
      success: true,
      membership
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching membership'
    });
  }
};

export const updateMembership = async (req, res) => {
  try {
    const membership = await Membership.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Membership not found'
      });
    }

    res.json({
      success: true,
      membership,
      message: 'Membership updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating membership'
    });
  }
};

export const deleteMembership = async (req, res) => {
  try {
    const membership = await Membership.findByIdAndDelete(req.params.id);
    
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Membership not found'
      });
    }

    res.json({
      success: true,
      message: 'Membership deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting membership'
    });
  }
};

// Profile Controllers
export const getAllProfiles = async (req, res) => {
  try {
    const profiles = await Profile.find()
      .populate('userId', 'email firstName lastName')
      .sort('-createdAt')
      .select('-__v');

    res.json({
      success: true,
      profiles,
      total: profiles.length
    });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profiles'
    });
  }
};

export const getProfileById = async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id)
      .populate('userId', 'email firstName lastName');
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const profile = await Profile.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate('userId', 'email firstName lastName');
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.json({
      success: true,
      profile,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

export const deleteProfile = async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    await Profile.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Profile deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting profile'
    });
  }
};

// Newsletter Subscribers Controllers
export const getAllNewsletterSubscribers = async (req, res) => {
  try {
    const subscribers = await Newsletter.find()
      .sort('-createdAt')
      .select('-__v');

    res.json({
      success: true,
      subscribers,
      total: subscribers.length
    });
  } catch (error) {
    console.error('Error fetching newsletter subscribers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching newsletter subscribers'
    });
  }
};

export const getNewsletterSubscriberById = async (req, res) => {
  try {
    const subscriber = await Newsletter.findById(req.params.id);
    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Newsletter subscriber not found'
      });
    }
    res.json({
      success: true,
      subscriber
    });
  } catch (error) {
    console.error('Error fetching newsletter subscriber:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching newsletter subscriber'
    });
  }
};

export const updateNewsletterSubscriber = async (req, res) => {
  try {
    const subscriber = await Newsletter.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    
    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Newsletter subscriber not found'
      });
    }

    res.json({
      success: true,
      subscriber,
      message: 'Newsletter subscriber updated successfully'
    });
  } catch (error) {
    console.error('Error updating newsletter subscriber:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating newsletter subscriber'
    });
  }
};

export const deleteNewsletterSubscriber = async (req, res) => {
  try {
    const subscriber = await Newsletter.findByIdAndDelete(req.params.id);
    
    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Newsletter subscriber not found'
      });
    }

    res.json({
      success: true,
      message: 'Newsletter subscriber deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting newsletter subscriber:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting newsletter subscriber'
    });
  }
};

// Notification Controllers
export const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('createdBy', 'firstName lastName email')
      .sort('-createdAt')
      .select('-__v');

    res.json({
      success: true,
      notifications,
      total: notifications.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
};

export const getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email');
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching notification'
    });
  }
};

export const updateNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate('createdBy', 'firstName lastName email');
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      notification,
      message: 'Notification updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating notification'
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    
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
    res.status(500).json({
      success: false,
      message: 'Error deleting notification'
    });
  }
};

// Announcement Controller
export const sendAnnouncement = async (req, res) => {
  try {
    const { 
      title, 
      message, 
      type = 'announcement',
      link = '',
      image = null,
      imageType = null
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }
    
    // Process the image if provided
    let processedImage = null;
    let processedImageType = null;
    
    if (image) {
      if (image.includes(';base64,')) {
        const matches = image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          processedImage = matches[2];
          processedImageType = matches[1];
        }
      } else {
        processedImage = image;
        processedImageType = imageType || 'image/jpeg';
      }
    }

    const notification = new Notification({
      title,
      message,
      type,
      link,
      isForAllUsers: true,
      createdBy: req.user?._id,
      image: processedImage,
      imageType: processedImageType,
      readBy: [],
      viewedBy: []
    });
    
    await notification.save();

    // Schedule email sending in the background
    setImmediate(async () => {
      try {
        console.log('Sending announcement emails to users with enabled notifications...');
        await sendAnnouncementEmail(notification);
      } catch (emailError) {
        console.error('Error sending announcement emails:', emailError);
      }
    });

    res.status(201).json({
      success: true,
      message: 'Announcement created and emails scheduled for delivery',
      data: {
        id: notification._id,
        title,
        message,
        type
      }
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating announcement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Stats Controllers
export const getUsersStats = async (req, res) => {
  try {
    const total = await User.countDocuments();
    const active = await User.countDocuments({ isEmailVerified: true });
    const admins = await User.countDocuments({ isAdmin: true });
    
    res.json({
      success: true,
      stats: {
        total,
        active,
        admins,
        inactive: total - active
      }
    });
  } catch (error) {
    console.error('Error fetching users stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users stats'
    });
  }
};

export const getMembershipsStats = async (req, res) => {
  try {
    const total = await Membership.countDocuments();
    const active = await Membership.countDocuments({ active: true });
    const pending = await Membership.countDocuments({ paymentStatus: 'pending' });
    
    res.json({
      success: true,
      stats: {
        total,
        active,
        pending,
        inactive: total - active
      }
    });
  } catch (error) {
    console.error('Error fetching memberships stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching memberships stats'
    });
  }
};

export const getNotificationsStats = async (req, res) => {
  try {
    const total = await Notification.countDocuments();
    const recent = await Notification.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    
    res.json({
      success: true,
      stats: {
        total,
        recent,
        lastWeek: recent
      }
    });
  } catch (error) {
    console.error('Error fetching notifications stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications stats'
    });
  }
};

export const getNewsletterStats = async (req, res) => {
  try {
    const total = await Newsletter.countDocuments();
    const active = await Newsletter.countDocuments({ isActive: true });
    
    res.json({
      success: true,
      stats: {
        total,
        active,
        inactive: total - active
      }
    });
  } catch (error) {
    console.error('Error fetching newsletter stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching newsletter stats'
    });
  }
};