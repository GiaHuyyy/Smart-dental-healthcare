import { sendRequestFile } from "../utils/api";

export interface UploadImageResponse {
  success: boolean;
  url: string;
  public_id: string;
}

export const uploadService = {
  /**
   * Upload image to Cloudinary via backend
   * @param file - File to upload
   * @returns Promise with upload result
   */
  async uploadImage(file: File): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append("image", file);

    const response = await sendRequestFile<UploadImageResponse>({
      url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/ai-chat-history/upload-image`,
      method: "POST",
      body: formData,
    });

    return response;
  },

  /**
   * Validate image file before upload
   * @param file - File to validate
   * @returns boolean indicating if file is valid
   */
  validateImageFile(file: File): { isValid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: "Chỉ hỗ trợ định dạng ảnh: JPEG, PNG, WebP",
      };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: "Kích thước file không được vượt quá 10MB",
      };
    }

    return { isValid: true };
  },
};
