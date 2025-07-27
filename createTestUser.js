import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure environment variables
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.env') });

// Import the User model
const User = (await import('./models/User.js')).default;

const createTestUser = async () => {
  try {
    // Connect to MongoDB using the same connection string as the main app
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');

    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    
    if (existingUser) {
      console.log('Test user already exists:', existingUser.email);
      console.log('Updating user to ensure it\'s active...');
      existingUser.isActive = true;
      await existingUser.save();
      console.log('Test user updated and activated');
      process.exit(0);
    }

    // Create test user
    console.log('Creating test user...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    const testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      isVerified: true,
      isActive: true,  // Make sure the user is active
      firstName: 'Test',
      lastName: 'User',
      isAdmin: false
    });

    await testUser.save();
    console.log('Test user created successfully:', testUser.email);
    console.log('You can now log in with email: test@example.com and password: password123');
    
    // Close the connection
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error creating test user:', err);
    process.exit(1);
  }
};

createTestUser();
