import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "./firebase";
import { uploadToCloudinary } from "./cloudinary";

/**
 * Upload file to Firebase Storage (for PDFs) or Cloudinary (for images)
 */
export const uploadFile = async (file, folder = "smart-class") => {
  if (!file) {
    throw new Error("No file provided for upload");
  }

  // Validate file size (50MB limit for PDFs, 10MB for images)
  const maxSize =
    file.type === "application/pdf" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(
      `File size should be less than ${maxSize / (1024 * 1024)}MB`,
    );
  }

  // Upload images to Cloudinary
  if (file.type.startsWith("image/")) {
    try {
      const result = await uploadToCloudinary(file, folder);
      return {
        url: result.secure_url,
        type: "image",
        publicId: result.public_id,
        originalName: file.name,
        size: file.size,
        storageType: "cloudinary",
      };
    } catch (error) {
      console.error("Error uploading image to Cloudinary:", error);
      throw new Error("Failed to upload image. Please try again.");
    }
  }

  // Upload PDFs to Firebase Storage
  if (file.type === "application/pdf") {
    try {
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name}`;
      const storageRef = ref(storage, `${folder}/pdfs/${filename}`);

      const metadata = { contentDisposition: "attachment" };
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        url: downloadURL,
        type: "pdf",
        path: snapshot.ref.fullPath,
        originalName: file.name,
        size: file.size,
        storageType: "firebase",
      };
    } catch (error) {
      console.error("Error uploading PDF to Firebase Storage:", error);
      throw new Error("Failed to upload PDF. Please try again.");
    }
  }

  throw new Error("Unsupported file type. Only images and PDFs are allowed.");
};

/**
 * Delete file from storage (Firebase Storage or Cloudinary)
 */
export const deleteFile = async (fileData) => {
  if (!fileData) return;

  try {
    if (fileData.storageType === "firebase" && fileData.path) {
      // Delete from Firebase Storage
      const fileRef = ref(storage, fileData.path);
      await deleteObject(fileRef);
    } else if (fileData.storageType === "cloudinary" && fileData.publicId) {
      // Delete from Cloudinary - Note: You need to implement Cloudinary deletion API
      // For now, we'll skip Cloudinary deletion as it requires server-side API
      //   console.log('Cloudinary file deletion requires server-side implementation');
    }
  } catch (error) {
    console.error("Error deleting file from storage:", error);
    // Don't throw error for deletion failures to avoid blocking other operations
  }
};

/**
 * Get file type from filename, MIME type, or URL
 */
export const getFileType = (file) => {
  if (typeof file === "string") {
    // It's a filename or URL
    if (file.toLowerCase().endsWith(".pdf")) return "pdf";
    if (file.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)) return "image";
    if (file.toLowerCase().match(/\.(mp4|avi|mov|wmv|flv|webm)$/))
      return "video";
    if (
      file.includes("youtube.com") ||
      file.includes("youtu.be") ||
      file.includes("vimeo.com")
    )
      return "video";
    return "unknown";
  }

  // It's a File object
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "unknown";
};

/**
 * Validate video URL
 */
export const validateVideoUrl = (url) => {
  if (!url || typeof url !== "string") return false;

  // Check for common video platforms
  const videoPatterns = [
    /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/,
    /^https?:\/\/(www\.)?vimeo\.com\/\d+/,
    /^https?:\/\/.*\.(mp4|avi|mov|wmv|flv|webm)$/i,
  ];

  return videoPatterns.some((pattern) => pattern.test(url));
};

const storageService = {
  uploadFile,
  deleteFile,
  getFileType,
  validateVideoUrl,
};

export default storageService;
