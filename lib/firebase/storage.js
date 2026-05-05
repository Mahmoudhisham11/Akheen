import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import app from './config';

// Initialize Storage
const storage = getStorage(app);

/**
 * Upload an image file to Firebase Storage
 * @param {File} file - Image file to upload
 * @param {string} path - Storage path (e.g., 'products/product-id/image.jpg')
 * @returns {Promise<string>} Download URL of the uploaded image
 */
export async function uploadImage(file, path) {
  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Get download URL for an image
 * @param {string} path - Storage path
 * @returns {Promise<string>} Download URL
 */
export async function getImageUrl(path) {
  try {
    const storageRef = ref(storage, path);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error getting image URL:', error);
    throw error;
  }
}

/**
 * Delete an image from Firebase Storage
 * @param {string} path - Storage path
 * @returns {Promise<void>}
 */
export async function deleteImage(path) {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}

export default storage;

