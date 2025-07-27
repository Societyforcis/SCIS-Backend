import UserSettings from '../models/UserSettings.js';
import User from '../models/User.js';

export const getUserSettings = async (req, res) => {
  try {
    const settings = await UserSettings.findOne({ userId: req.user._id });
    
    if (!settings) {
      // Create default settings if none exist
      const newSettings = new UserSettings({ userId: req.user._id });
      await newSettings.save();
      return res.json({ success: true, settings: newSettings });
    }
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching settings",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { emailNotifications, pushNotifications, profileVisibility, darkMode } = req.body;
    
    console.log('Updating settings for user:', req.user._id);
    console.log('Received settings:', req.body);
    
    const settings = await UserSettings.findOneAndUpdate(
      { userId: req.user._id },
      { emailNotifications, pushNotifications, profileVisibility, darkMode },
      { new: true, upsert: true }
    );
    
    console.log('Updated settings:', settings);
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ 
      success: false, 
      message: "Error updating settings",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get users who have email notifications enabled
export const getUsersWithEmailNotifications = async () => {
  try {
    // Find all settings where emailNotifications is true
    const settings = await UserSettings.find({ emailNotifications: true })
      .populate('userId', 'email isAdmin')
      .lean();
    
    // Filter out admins and extract emails
    const userEmails = settings
      .filter(setting => setting.userId && !setting.userId.isAdmin)
      .map(setting => setting.userId.email);
    
    return userEmails;
  } catch (error) {
    console.error('Error getting users with email notifications:', error);
    throw error;
  }
};

// Check if a specific user has email notifications enabled
export const hasEmailNotificationsEnabled = async (userId) => {
  try {
    const settings = await UserSettings.findOne({ userId });
    return settings ? settings.emailNotifications : true; // Default to true if no settings found
  } catch (error) {
    console.error(`Error checking email notifications for user ${userId}:`, error);
    return true; // Default to true in case of error
  }
};