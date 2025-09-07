import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from './models/notification.model';

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('MongoDB connected for testing');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const createTestNotifications = async () => {
  try {
    console.log('Creating test notifications...');
    
    // Test user ID (using a real user from the database)
    const testUserId = '6868ea10742612ec71d5868b'; // Real user: user1@gmail.com
    
    // Create sample notifications
    const notifications = [
      {
        userId: testUserId,
        title: 'Welcome to Algoqube AI!',
        message: 'Your account has been successfully created. Start building your AI chatbot today!',
        type: 'success' as const,
        read: false
      },
      {
        userId: testUserId,
        title: 'New Feature Available',
        message: 'Color analysis feature is now available for all users. Try it out!',
        type: 'info' as const,
        read: false
      },
      {
        userId: testUserId,
        title: 'Storage Warning',
        message: 'You are using 85% of your storage quota. Consider upgrading your plan.',
        type: 'warning' as const,
        read: true
      },
      {
        userId: testUserId,
        title: 'Chatbot Deployed',
        message: 'Your AI assistant "TechBot" has been successfully deployed to your website.',
        type: 'success' as const,
        read: false
      },
      {
        userId: testUserId,
        title: 'System Maintenance',
        message: 'Scheduled maintenance will occur tonight at 2 AM. Service may be briefly unavailable.',
        type: 'info' as const,
        read: false
      }
    ];

    // Clear existing test notifications
    await Notification.deleteMany({ userId: testUserId });
    console.log('Cleared existing test notifications');

    // Create new notifications
    const createdNotifications = await Notification.insertMany(notifications);
    console.log(`Created ${createdNotifications.length} test notifications`);

    // Test fetching notifications
    const allNotifications = await Notification.find({ userId: testUserId }).sort({ createdAt: -1 });
    console.log('\nAll notifications:');
    allNotifications.forEach((notification, index) => {
      console.log(`${index + 1}. ${notification.title} (${notification.type}) - ${notification.read ? 'Read' : 'Unread'}`);
    });

    // Test unread count
    const unreadCount = await Notification.countDocuments({ userId: testUserId, read: false });
    console.log(`\nUnread notifications: ${unreadCount}`);

    console.log('\n✅ Test notifications created successfully!');
    console.log(`Test User ID: ${testUserId}`);
    console.log('You can now test the notification system in the frontend.');

  } catch (error) {
    console.error('Error creating test notifications:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the test
connectDB().then(() => {
  createTestNotifications();
}); 