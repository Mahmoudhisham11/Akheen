const CLOUDINARY_CLOUD_NAME = 'drtdv4iyr';
const CLOUDINARY_UPLOAD_PRESET = 'cashat_abod';

export async function uploadImageToCloudinary(file) {
  if (!file) {
    throw new Error('IMAGE_FILE_REQUIRED');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || 'CLOUDINARY_UPLOAD_FAILED';
    throw new Error(message);
  }

  if (!payload.secure_url) {
    throw new Error('CLOUDINARY_URL_MISSING');
  }

  return {
    imageUrl: payload.secure_url,
    imagePublicId: payload.public_id || null,
  };
}

