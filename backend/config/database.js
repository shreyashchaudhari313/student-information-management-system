import mongoose from 'mongoose';

export async function connectDatabase() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI is missing. Please set your MongoDB Atlas connection string.');
    return false;
  }

  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log('Connected to MongoDB Atlas.');
    return true;
  } catch (error) {
    console.error('⚠️ MongoDB connection error:', error.message);
    return false;
  }
}
