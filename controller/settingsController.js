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
    // Validate if user is authenticated
    if (!req.user || !req.user._id) {
      console.error('User not authenticated or missing ID');
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    const userId = req.user._id;
    
    // Enhanced debugging
    console.log('Raw request body:', JSON.stringify(req.body));
    console.log('User ID:', userId.toString());
    
    // Create update object with strict boolean conversion
    const updateFields = {};
    
    // Check if fields exist in request and handle them explicitly
    if ('emailNotifications' in req.body) {
      updateFields.emailNotifications = Boolean(req.body.emailNotifications);
      console.log(`Setting emailNotifications to: ${updateFields.emailNotifications} (original value: ${req.body.emailNotifications}, type: ${typeof req.body.emailNotifications})`);
    }
    
    if ('pushNotifications' in req.body) {
      updateFields.pushNotifications = Boolean(req.body.pushNotifications);
      console.log(`Setting pushNotifications to: ${updateFields.pushNotifications} (original value: ${req.body.pushNotifications})`);
    }
    
    if ('profileVisibility' in req.body) {
      updateFields.profileVisibility = Boolean(req.body.profileVisibility);
      console.log(`Setting profileVisibility to: ${updateFields.profileVisibility} (original value: ${req.body.profileVisibility})`);
    }
    
    if ('darkMode' in req.body) {
      updateFields.darkMode = Boolean(req.body.darkMode);
      console.log(`Setting darkMode to: ${updateFields.darkMode} (original value: ${req.body.darkMode})`);
    }
    
    console.log('Final update fields:', updateFields);
    
    // Check if document exists first (for debugging)
    const existingSettings = await UserSettings.findOne({ userId });
    console.log('Existing settings document:', existingSettings);
    
    // Perform the update with explicit options
    const result = await UserSettings.findOneAndUpdate(
      { userId },
      updateFields,
      { 
        new: true, 
        upsert: true,
        runValidators: true
      }
    );
    
    console.log('Update result:', result);
    
    // Verify the update worked by fetching fresh data
    const verifiedSettings = await UserSettings.findOne({ userId });
    console.log('Verified settings after update:', verifiedSettings);
    
    res.json({
      success: true,
      settings: result
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: "Failed to update settings",
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


};  }
