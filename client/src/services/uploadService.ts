import realtimeChatService from "./realtimeChatService";

export interface UploadImageResponse {
  success: boolean;
  url?: string;
  public_id?: string;
  error?: string;
}

/**
 * Convert file to base64 string for socket transmission
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const uploadService = {
  /**
   * Upload image via socket to realtimeChatService
   * @param file - File to upload
   * @param conversationId - Conversation ID for context
   * @returns Promise with upload result
   */
  async uploadImage(file: File, conversationId: string = ""): Promise<UploadImageResponse> {
    try {
      // Convert file to base64
      const base64Data = await fileToBase64(file);

      // Upload via socket service
      const response = await realtimeChatService.uploadImage(conversationId, base64Data, file.name, file.type);

      return response;
    } catch (error) {
      console.error("Socket upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
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
