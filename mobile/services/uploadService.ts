import realtimeChatService from './realtimeChatService';

export interface UploadImageResponse {
  success: boolean;
  url?: string;
  public_id?: string;
  error?: string;
}

export interface UploadFileInfo {
  uri: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
}

/**
 * Convert file URI to base64 string for socket transmission
 * Uses fetch API to read the file as blob, then convert to base64
 */
async function fileToBase64(uri: string): Promise<string> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = base64data.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('❌ [Upload] Error reading file:', error);
    throw new Error('Không thể đọc file');
  }
}

class UploadService {
  /**
   * Upload image via socket to realtimeChatService
   * @param file - File info to upload
   * @param conversationId - Conversation ID for context
   * @returns Promise with upload result
   */
  async uploadImage(file: UploadFileInfo, conversationId: string = ''): Promise<UploadImageResponse> {
    try {
      console.log('📤 [Upload] Starting upload:', file.fileName);

      // Validate file first
      const validation = await this.validateImageFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Convert file to base64
      const base64Data = await fileToBase64(file.uri);

      // Determine file type
      const fileType = file.mimeType || 'image/jpeg';
      const fileName = file.fileName || `image_${Date.now()}.jpg`;

      console.log(`📤 [Upload] Uploading via socket: ${fileName} (${fileType})`);

      // Upload via socket service
      const response = await realtimeChatService.uploadImage(conversationId, base64Data, fileName, fileType);

      if (response.success) {
        console.log('✅ [Upload] Upload successful:', response.url);
      } else {
        console.error('❌ [Upload] Upload failed:', response.error);
      }

      return response;
    } catch (error) {
      console.error('❌ [Upload] Socket upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Validate image file before upload
   * @param file - File info to validate
   * @returns validation result
   */
  async validateImageFile(file: UploadFileInfo): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const fileType = file.mimeType?.toLowerCase() || '';
      
      if (fileType && !allowedTypes.some((type) => fileType.includes(type))) {
        return {
          isValid: false,
          error: 'Chỉ hỗ trợ định dạng ảnh: JPEG, PNG, WebP',
        };
      }

      // Check file size if provided (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.fileSize && file.fileSize > maxSize) {
        return {
          isValid: false,
          error: 'Kích thước file không được vượt quá 10MB',
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error('❌ [Upload] Validation error:', error);
      return {
        isValid: false,
        error: 'Không thể kiểm tra file',
      };
    }
  }

  /**
   * Get file size in human-readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

export default new UploadService();
