import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['system', 'membership', 'event', 'admin', 'announcement'],
    default: 'system'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  link: {
    type: String,
    default: ''
  },
  // Store recipients as an array of user IDs or 'all'
  recipients: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    required: true,
    validate: {
      validator: function(v) {
        // Allow empty array or array of ObjectIds
        return Array.isArray(v) && v.every(id => mongoose.Types.ObjectId.isValid(id));
      },
      message: props => `${props.value} is not a valid array of user IDs`
    }
  },
  // Store if this notification is for all users
  isForAllUsers: {
    type: Boolean,
    default: false
  },
  image: {
    type: String,
    default: null
  },
  imageType: {
    type: String,
    default: null
  },
  // Track users who have read the notification
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // New field to track users who have viewed the notification
  viewedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Index for faster querying
notificationSchema.index({ 'recipients': 1, 'isForAllUsers': 1, 'createdAt': -1 });
notificationSchema.index({ 'readBy': 1 });
notificationSchema.index({ 'viewedBy': 1 });

// Add a virtual property for image URL
notificationSchema.virtual('imageUrl').get(function() {
  if (!this.image || !this.imageType) return null;
  return `data:${this.imageType};base64,${this.image}`;
});

// Add a virtual property for read count
notificationSchema.virtual('readCount').get(function() {
  return this.readBy ? this.readBy.length : 0;
});

// Add a virtual property for view count
notificationSchema.virtual('viewCount').get(function() {
  return this.viewedBy ? this.viewedBy.length : 0;
});

// Add a static method to find notifications for a specific user
notificationSchema.statics.findForUser = async function(userId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;
  
  const [notifications, total] = await Promise.all([
    this.find({
      $or: [
        { isForAllUsers: true },
        { recipients: userId }
      ]
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('createdBy', 'name email')
    .lean(),
    
    this.countDocuments({
      $or: [
        { isForAllUsers: true },
        { recipients: userId }
      ]
    })
  ]);

  // Add read and view status to each notification
  const notificationsWithStatus = notifications.map(notification => ({
    ...notification,
    isRead: notification.readBy?.includes(userId) || false,
    isViewed: notification.viewedBy?.includes(userId) || false
  }));

  return {
    data: notificationsWithStatus,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  };
};

// Static method to count unread notifications for a user
notificationSchema.statics.countUnreadForUser = async function(userId) {
  const count = await this.countDocuments({
    $or: [
      { isForAllUsers: true },
      { recipients: userId }
    ],
    readBy: { $ne: userId }
  });
  
  return count;
};

// Update the recipients validation to allow empty arrays when isForAllUsers is true
notificationSchema.path('recipients').validate(function(value) {
  // If isForAllUsers is true, recipients can be empty
  if (this.isForAllUsers === true) {
    return true;
  }
  // Otherwise, require valid recipients
  return Array.isArray(value) && value.length > 0 && 
    value.every(id => mongoose.Types.ObjectId.isValid(id));
}, 'Recipients are required when not sending to all users');

export default mongoose.model('Notification', notificationSchema);