import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      email: string
      name?: string | null
      image?: string | null
      isAdmin?: boolean
      isCoach?: boolean
      isStaff?: boolean
    }
    lastValidated?: string
    sessionType?: 'admin' | 'user'
    accessToken?: string
    refreshToken?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    email?: string
    isAdmin?: boolean
    isCoach?: boolean
    isStaff?: boolean
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
  }
} 