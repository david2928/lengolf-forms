import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      email: string
      name?: string | null
      image?: string | null
      isAdmin?: boolean
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    email?: string
    isAdmin?: boolean
  }
} 