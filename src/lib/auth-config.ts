import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from "next-auth/providers/google"
import { isUserAllowed, isUserAdmin, isUserCoach } from "@/lib/auth"

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
    async signIn({ user, account, profile }) {
      // Enhanced sign-in validation
      if (!user.email) {
        console.error('SignIn attempt without email');
        return false;
      }
      
      try {
        const isAllowed = await isUserAllowed(user.email);
        if (!isAllowed) {
          console.log(`SignIn denied for unauthorized email: ${user.email}`);
          return false;
        }
        
        console.log(`SignIn approved for email: ${user.email}`);
        return true;
        
      } catch (error) {
        console.error('Error during sign-in validation:', error);
        return false;
      }
    },
    
    async jwt({ token, user, account, trigger }) {
      // Enhanced JWT handling with security improvements
      if (user?.email) {
        const adminStatus = await isUserAdmin(user.email);
        const coachStatus = await isUserCoach(user.email);
        token.isAdmin = adminStatus;
        token.isCoach = coachStatus;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.isAdmin = token.isAdmin;
        session.user.isCoach = token.isCoach;
      }
      
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days for regular users
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log('User signed in:', {
        email: user.email,
        provider: account?.provider,
        isNewUser
      });
    },
    async signOut({ token, session }) {
      console.log('User signed out:', {
        email: token?.email || session?.user?.email
      });
    },
    async session({ session, token }) {
      // Log admin session activity
      if (token.isAdmin) {
        console.log('Admin session activity:', {
          email: session.user?.email,
          timestamp: new Date().toISOString()
        });
      }
    }
  },
  debug: process.env.NODE_ENV === 'development',
}