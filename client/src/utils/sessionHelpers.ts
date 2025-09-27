import { Session } from "next-auth";

export interface UserData {
  userId: string;
  email?: string;
  name?: string;
  fullName?: string;
  role?: string;
  token?: string;
}

/**
 * Extract essential user data from session
 * @param session Next-auth session
 */
export function extractUserData(session: Session | null): UserData | null {
  if (!session?.user) return null;

  const user = session.user as any;

  // Get user ID - prioritize MongoDB _id if available
  const userId = user._id || user.id;

  // Extract auth token from various locations
  const token =
    (session as any)?.accessToken ||
    (session as any)?.access_token ||
    user.access_token ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token");

  return {
    userId,
    email: user.email,
    name: user.name,
    fullName: user.fullName,
    role: user.role,
    token,
  };
}

/**
 * Format token as Bearer token if needed
 * @param token Raw token string
 */
export function formatBearerToken(token: string | undefined): string | undefined {
  if (!token) return undefined;
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

/**
 * Check if user has required role
 * @param session Next-auth session
 * @param requiredRole Required role to check
 */
export function hasRole(session: Session | null, requiredRole: string): boolean {
  const userData = extractUserData(session);
  return userData?.role === requiredRole;
}

/**
 * Get user display name
 * @param session Next-auth session
 */
export function getUserDisplayName(session: Session | null): string {
  const userData = extractUserData(session);
  return userData?.fullName || userData?.name || userData?.email || "Unknown User";
}
