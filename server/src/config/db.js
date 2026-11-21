import mongoose from "mongoose";
import logger from "../logger/logger.js";

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/punchpoint";
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    // In dev / test we don't necessarily exit process if handled
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
};
