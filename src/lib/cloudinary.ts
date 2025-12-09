import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export interface UploadResult {
  url: string;
  publicId: string;
}

/**
 * Upload an image to local storage
 * @param file - Base64 encoded image data
 * @param folder - Folder to upload to (e.g., 'properties' or 'room-types')
 * @returns Upload result with URL and public ID
 */
export async function uploadImage(file: string, folder: string = 'properties'): Promise<UploadResult> {
  try {
    // Extract the base64 data and file type
    const matches = file.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid image data format');
    }

    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Create unique filename
    const filename = `${randomUUID()}.${extension}`;
    const publicId = `${folder}/${filename}`;
    
    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Write file to disk
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Return the public URL
    const url = `/uploads/${folder}/${filename}`;

    return {
      url,
      publicId,
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
}

/**
 * Delete an image from local storage
 * @param publicId - The public ID of the image to delete
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'uploads', publicId);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error('Failed to delete image');
  }
}
