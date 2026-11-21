import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import logger from "../logger/logger.js";

// Initialize Cloudinary if credentials exist
const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  logger.info("Cloudinary photo storage configured");
} else {
  logger.info("Cloudinary not configured; defaulting to local storage in /uploads");
}

/**
 * Saves a base64 encoded photo (data:image/jpeg;base64,...) or URL
 * Returns public URL to the photo
 */
export async function saveSelfie(base64Data, prefix = "selfie") {
  if (!base64Data) {
    throw new Error("Selfie image data is required");
  }

  // If already a hosted URL (e.g. from seed data), return as is
  if (base64Data.startsWith("http://") || base64Data.startsWith("https://")) {
    return base64Data;
  }

  // Upload to Cloudinary if configured
  if (isCloudinaryConfigured) {
    try {
      const uploadRes = await cloudinary.uploader.upload(base64Data, {
        folder: "punchpoint_selfies",
        transformation: [{ width: 600, height: 600, crop: "limit", quality: "auto" }],
      });
      return uploadRes.secure_url;
    } catch (err) {
      logger.error(`Cloudinary upload failed: ${err.message}. Falling back to local.`);
    }
  }

  // Local fallback: save to /uploads
  const uploadDir = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Extract base64 payload
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  const ext = matches && matches[1] ? matches[1].split("/")[1] || "jpg" : "jpg";
  const rawData = matches ? matches[2] : base64Data;
  const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const filePath = path.join(uploadDir, fileName);

  await fs.promises.writeFile(filePath, Buffer.from(rawData, "base64"));
  return `/uploads/${fileName}`;
}
