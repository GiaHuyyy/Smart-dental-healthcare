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
        // Normalize and inspect response to support multiple backend shapes
        console.log("User response:", res);

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
    // error: "/auth/login"
  },
  //  By default, the `id` property does not exist on `token` or `session`. See the [TypeScript](https://authjs.dev/getting-started/typescript) on how to add it.
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // User is available during sign-in
        token.user = user as IUser;
      }
      return token;
    },
    session({ session, token }) {
      (session.user as IUser) = token.user;
      return session;
    },
    authorized: async ({ auth }) => {
      // Logged in users are authenticated, otherwise redirect to login page
      return !!auth;
    },
  },
});
