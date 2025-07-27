import Membership from '../models/Membership.js';
import Profile from '../models/Profile.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Newsletter from '../models/Newsletter.js';
import { sendAnnouncementEmail } from '../services/emailService.js';

// Membership Controllers
export const getAllMemberships = async (req, res) => {
  try {
    const memberships = await Membership.find()
      .sort('-createdAt')
      .select('-__v');

    res.json({
      success: true,
      memberships
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
      membership
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
      .populate('userId', 'email isAdmin')
      .sort('-createdAt')
      .select('-__v');

    res.json({
      success: true,
      profiles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profiles'
    });
  }
};

export const getProfileById = async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id)
      .populate('userId', 'email isAdmin');
    
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
    );
    
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
      message: 'Error updating profile'
    });
  }
};

export const deleteProfile = async (req, res) => {
  try {
    const profile = await Profile.findByIdAndDelete(req.params.id);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Also delete associated user if needed
    await User.findByIdAndDelete(profile.userId);

    res.json({
      success: true,
      message: 'Profile and associated user deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting profile'
    });
  }
};


// import User from '../models/User.js';

// @desc    Get all users for admin
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        // We use .lean() for performance because we only need to read the data.
        // We are selecting all fields from the User model except the password.
        const users = await User.find({}).select('-password').lean();

        // The key issue is that `firstName` and `lastName` are on the User model itself
        // according to your schema, not a separate Profile model as initially suspected.
        // The User model already contains `firstName` and `lastName`.
        // Therefore, we just need to send the user data as is.
        // The frontend `User` interface already matches this schema.

        if (users) {
            res.status(200).json({
                success: true,
                users: users,
            });
        } else {
            res.status(404).json({ success: false, message: 'No users found' });
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Delete a user
// @route   DELETE /api/admin/user/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            // Add any additional checks here, e.g., preventing deletion of the main admin
            if (user.email === 'societyforcis.org@gmail.com') {
                res.status(400).json({ success: false, message: 'Cannot delete the primary admin account.' });
                return;
            }

            await user.deleteOne(); // Mongoose v6+ uses deleteOne()
            res.status(200).json({ success: true, message: 'User removed' });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};


// You would add other admin functions here like updateUser, etc.

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
      // Check if it's already in the expected format
      if (image.includes(';base64,')) {
        // Extract data from data URL
        const matches = image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          processedImage = matches[2];
          processedImageType = matches[1];
          console.log(`Image included: ${processedImageType} (${Math.round(processedImage.length / 1024)}KB)`);
        }
      } else {
        processedImage = image;
        processedImageType = imageType || 'image/jpeg';
      }
    }

    // Create a notification for the announcement
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
        type,
        imageIncluded: !!processedImage
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
    const count = await User.countDocuments();
    res.json({
      success: true,
      count
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
    const count = await Membership.countDocuments({ active: true });
    res.json({
      success: true,
      count
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
    const count = await Notification.countDocuments();
    res.json({
      success: true,
      count
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
    const count = await Newsletter.countDocuments({ isActive: true });
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error fetching newsletter stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching newsletter stats'
    });
  }
};

// Newsletter Subscribers Controllers
export const getAllNewsletterSubscribers = async (req, res) => {
  try {
    const subscribers = await Newsletter.find()
      .sort('-createdAt');

    res.json({
      success: true,
      subscribers
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
      subscriber
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

export {
    getAllUsers,
    deleteUser,
    // sendAnnouncement,
};