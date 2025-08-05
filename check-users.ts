import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user.model';

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('MongoDB connected for user check');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const checkUsers = async () => {
  try {
    console.log('Checking for users in database...');
    
    const users = await User.find({}).select('_id email name createdAt').lean();
    
    if (users.length === 0) {
      console.log('No users found in database');
      console.log('You can create a user by registering through the frontend');
    } else {
      console.log(`Found ${users.length} user(s):`);
      users.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user._id}, Email: ${user.email}, Name: ${user.name || 'N/A'}, Created: ${user.createdAt}`);
      });
      
      if (users.length > 0) {
        console.log(`\nYou can use the first user ID (${users[0]._id}) to test notifications`);
      }
    }

  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the check
connectDB().then(() => {
  checkUsers();
}); 