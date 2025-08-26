import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(filePath: string, filename: string): Promise<{ url: string; public_id: string }> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        filePath,
        {
          folder: 'smart-dental-healthcare/chatbot',
          resource_type: 'image',
          public_id: filename.replace(/\.[^/.]+$/, ''), // Remove file extension
          transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              public_id: result.public_id
            });
          }
        }
      );
    });
  }

  async uploadImageFromBuffer(buffer: Buffer, filename: string): Promise<{ url: string; public_id: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'smart-dental-healthcare/chatbot',
          resource_type: 'image',
          public_id: filename.replace(/\.[^/.]+$/, ''), // Remove file extension
          transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              public_id: result.public_id
            });
          }
        }
      );

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  async deleteImage(public_id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(public_id, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async getImageUrl(public_id: string, options?: any): Promise<string> {
    return cloudinary.url(public_id, {
      secure: true,
      ...options
    });
  }
}
