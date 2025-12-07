import * as crypto from 'crypto';

const bcrypt = require('bcrypt');
const saltRounds = 10;

/**
 * Generate a cryptographically secure 6-digit OTP
 */
export const generateOTP = (): string => {
  // Generate random bytes and convert to 6-digit number
  const randomBytes = crypto.randomBytes(4);
  const randomNumber = randomBytes.readUInt32BE(0);
  // Ensure 6 digits (100000 - 999999)
  const otp = 100000 + (randomNumber % 900000);
  return otp.toString();
};

/**
 * Hash OTP before storing in database (same as password hashing)
 */
export const hashOTP = async (otp: string): Promise<string> => {
  try {
    return await bcrypt.hash(otp, saltRounds);
  } catch (error) {
    console.error('Error hashing OTP:', error);
    throw error;
  }
};

/**
 * Compare plain OTP with hashed OTP from database
 */
export const compareOTP = async (
  plainOTP: string,
  hashedOTP: string,
): Promise<boolean> => {
  try {
    return await bcrypt.compare(plainOTP, hashedOTP);
  } catch (error) {
    console.error('Error comparing OTP:', error);
    return false;
  }
};

/**
 * Format OTP for display in email (add spaces for readability)
 * Example: "123456" -> "1 2 3 4 5 6"
 */
export const formatOTPForDisplay = (otp: string): string => {
  return otp.split('').join(' ');
};
