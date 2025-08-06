import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { InactiveAccountError, InvalidEmailPasswordError } from "./utils/errors";
import { sendRequest } from "./utils/api";
import { IUser } from "./types/next-auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      // You can specify which fields should be submitted, by adding keys to the `credentials` object.
      // e.g. domain, username, password, 2FA token, etc.
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const res = await sendRequest<IBackendRes<ILogin> | ILogin>({
          method: "POST",
          url: "http://localhost:8081/api/v1/auth/login",
          body: {
            username: credentials?.email,
            password: credentials?.password,
          },
        });

        console.log("User response:", res);

        // Check if the response is a direct user object (no statusCode) or contains statusCode
        if (!("statusCode" in res)) {
          // Direct response with user data
          return {
            id: res.user._id, // NextAuth requires this id field
            _id: res.user._id,
            email: res.user.email,
            fullName: res.user.fullName,
            // isVerify: true, // Set default or extract from response if available
            // type: "patient", // Set default or extract from response if available
            // role: "patient", // Set default or extract from response if available
            access_token: res.access_token,
          };
        } else if (+res.statusCode === 401) {
          throw new InvalidEmailPasswordError();
        } else if (+res.statusCode === 400) {
          throw new InactiveAccountError();
        } else {
          throw new Error(res.message || "Đã có lỗi xảy ra");
        }
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
        // console.log("User data:", token);
        token.user = user as IUser;
      }
      return token;
    },
    session({ session, token }) {
      (session.user as IUser) = token.user;
      return session;
    },
  },
});
