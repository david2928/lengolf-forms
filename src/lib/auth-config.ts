import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from "next-auth/providers/google"
import { isUserAllowed, isUserAdmin } from "@/lib/auth"

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user }) {
      return await isUserAllowed(user.email)
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const adminStatus = await isUserAdmin(user.email);
        token.isAdmin = adminStatus;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.isAdmin = token.isAdmin;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
}