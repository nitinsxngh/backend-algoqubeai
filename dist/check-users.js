"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const user_model_1 = __importDefault(require("./models/user.model"));
dotenv_1.default.config();
// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGO_URI);
        console.log('MongoDB connected for user check');
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};
const checkUsers = async () => {
    try {
        console.log('Checking for users in database...');
        const users = await user_model_1.default.find({}).select('_id email name createdAt').lean();
        if (users.length === 0) {
            console.log('No users found in database');
            console.log('You can create a user by registering through the frontend');
        }
        else {
            console.log(`Found ${users.length} user(s):`);
            users.forEach((user, index) => {
                console.log(`${index + 1}. ID: ${user._id}, Email: ${user.email}, Name: ${user.name || 'N/A'}, Created: ${user.createdAt}`);
            });
            if (users.length > 0) {
                console.log(`\nYou can use the first user ID (${users[0]._id}) to test notifications`);
            }
        }
    }
    catch (error) {
        console.error('Error checking users:', error);
    }
    finally {
        await mongoose_1.default.connection.close();
        console.log('Database connection closed');
    }
};
// Run the check
connectDB().then(() => {
    checkUsers();
});
