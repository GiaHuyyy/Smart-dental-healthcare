import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Thêm type definition cho Express.Multer
declare global {
  namespace Express {
    namespace Multer {
      interface File {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
        size: number;
      }
    }
  }
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private isConfigured = false;

  constructor() {
    this.configureCloudinary();
  }

  private configureCloudinary() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.error(
        'Cloudinary configuration missing. Please check your environment variables.',
      );
      this.logger.error(
        `CLOUDINARY_CLOUD_NAME: ${cloudName ? 'Set' : 'Missing'}`,
      );
      this.logger.error(`CLOUDINARY_API_KEY: ${apiKey ? 'Set' : 'Missing'}`);
      this.logger.error(
        `CLOUDINARY_API_SECRET: ${apiSecret ? 'Set' : 'Missing'}`,
      );
      this.isConfigured = false;
      return;
    }

    try {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.isConfigured = true;
      this.logger.log('Cloudinary configured successfully');
    } catch (error) {
      this.logger.error('Failed to configure Cloudinary:', error);
      this.isConfigured = false;
    }
  }

  async uploadImage(
    file: Express.Multer.File,
  ): Promise<{ url: string; public_id: string }> {
    if (!this.isConfigured) {
      throw new Error(
        'Cloudinary is not configured. Please check your environment variables.',
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'smart-dental-healthcare',
          resource_type: 'image',
          transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            this.logger.error('Cloudinary upload error:', error);
            reject(error);
          } else if (!result) {
            reject(new Error('Upload failed: No result returned'));
          } else {
            this.logger.log(
              `Image uploaded successfully: ${result.secure_url}`,
            );
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
            });
          }
        },
      );

      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ url: string; public_id: string }> {
    if (!this.isConfigured) {
      throw new Error(
        'Cloudinary is not configured. Please check your environment variables.',
      );
    }

    return new Promise((resolve, reject) => {
      // Determine resource type based on file type
      let resourceType: 'image' | 'video' | 'raw' = 'raw';
      let options: any = {
        folder: 'smart-dental-healthcare',
        resource_type: resourceType,
      };

      if (file.mimetype.startsWith('image/')) {
        resourceType = 'image';
        options = {
          ...options,
          resource_type: resourceType,
          transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' },
          ],
        };
      } else if (file.mimetype.startsWith('video/')) {
        resourceType = 'video';
        options = {
          ...options,
          resource_type: resourceType,
          transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto' },
          ],
        };
      } else {
        // For documents, PDFs, etc. use raw
        resourceType = 'raw';
        options = {
          ...options,
          resource_type: resourceType,
        };
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            this.logger.error('Cloudinary upload error:', error);
            reject(error);
          } else if (!result) {
            reject(new Error('Upload failed: No result returned'));
          } else {
            this.logger.log(`File uploaded successfully: ${result.secure_url}`);
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
            });
          }
        },
      );

      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  async uploadImageFromBuffer(
    buffer: Buffer,
    filename: string,
  ): Promise<{ url: string; public_id: string }> {
    if (!this.isConfigured) {
      throw new Error(
        'Cloudinary is not configured. Please check your environment variables.',
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'smart-dental-healthcare',
          resource_type: 'image',
          public_id: filename.replace(/\.[^/.]+$/, ''), // Remove file extension
          transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            this.logger.error('Cloudinary upload error:', error);
            reject(error);
          } else if (!result) {
            reject(new Error('Upload failed: No result returned'));
          } else {
            this.logger.log(
              `Image uploaded successfully: ${result.secure_url}`,
            );
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
            });
          }
        },
      );

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  async deleteImage(public_id: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error(
        'Cloudinary is not configured. Please check your environment variables.',
      );
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(public_id, (error, result) => {
        if (error) {
          this.logger.error('Cloudinary delete error:', error);
          reject(error);
        } else {
          this.logger.log(`Image deleted successfully: ${public_id}`);
          resolve();
        }
      });
    });
  }

  async getImageUrl(public_id: string, options?: any): Promise<string> {
    if (!this.isConfigured) {
      throw new Error(
        'Cloudinary is not configured. Please check your environment variables.',
      );
    }

    return cloudinary.url(public_id, {
      secure: true,
      ...options,
    });
  }

  // Method to check if Cloudinary is properly configured
  isCloudinaryConfigured(): boolean {
    return this.isConfigured;
  }
}
