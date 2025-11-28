import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { IUser } from "./types/next-auth";
import { sendRequest } from "./utils/api";
import { InactiveAccountError, InvalidEmailPasswordError } from "./utils/errors";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      // You can specify which fields should be submitted, by adding keys to the `credentials` object.
      // e.g. domain, username, password, 2FA token, etc.
      credentials: {
        email: {},
        password: {},
        role: {},
      },
      authorize: async (credentials) => {
        const res = await sendRequest<IBackendRes<ILogin>>({
          method: "POST",
          url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/login`,
          body: {
            username: credentials?.email,
            password: credentials?.password,
            role: credentials?.role,
          },
        });

        // If backend returned wrapped data { data: { user, access_token } }
        const wrappedUser = (res as any)?.data?.user;
        const wrappedToken = (res as any)?.data?.access_token || (res as any)?.data?.accessToken;

        // If backend returned user directly
        const directUser = (res as any)?.user || (res as any)?.data;
        const directToken = (res as any)?.access_token || (res as any)?.accessToken || (res as any)?.data?.access_token;

        if (wrappedUser) {
          return {
            _id: wrappedUser._id,
            email: wrappedUser.email,
            fullName: wrappedUser.fullName,
            role: wrappedUser.role,
            avatarUrl: wrappedUser.avatarUrl,
            access_token: wrappedToken,
          };
        }

        if (directUser && (directUser._id || (directUser.user && directUser.user._id))) {
          const u = directUser._id ? directUser : directUser.user;
          return {
            _id: u._id,
            email: u.email,
            fullName: u.fullName,
            role: u.role,
            avatarUrl: u.avatarUrl,
            access_token: directToken,
          };
        }

        // Handle explicit error status codes returned by sendRequest
        const statusCode = Number((res as any)?.statusCode || (res as any)?.status || 0);
        if (statusCode === 401) throw new InvalidEmailPasswordError();
        if (statusCode === 400) throw new InactiveAccountError();

        // Fallback: if backend returned an error message
        const message = (res as any)?.message || (res as any)?.error || "Đã có lỗi xảy ra";
        throw new Error(message);
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 5 * 60 * 60, // 5 hours (match backend JWT_ACCESS_TOKEN_EXPIRED)
    updateAge: 5 * 60, // Update session cookie every 5 minutes if user active
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.user = user as IUser;
        token.access_token = (user as any).access_token;
        token.access_expire = Date.now() + 5 * 60 * 60 * 1000; // 5 hours from now
      }

      // Check if token expired
      if (token.access_expire && Date.now() > (token.access_expire as number)) {
        return null; // This will trigger sign-out
      }

      return token;
    },
    session({ session, token }) {
      (session.user as IUser) = token.user;
      (session as any).access_token = token.access_token;
      (session as any).access_expire = token.access_expire;
      return session;
    },
    authorized: async ({ auth }) => {
      // Logged in users are authenticated, otherwise redirect to login page
      return !!auth;
    },
  },
});
