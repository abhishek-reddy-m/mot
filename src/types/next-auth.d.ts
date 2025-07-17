import NextAuth, { type DefaultSession } from "next-auth"

export type ExtendedUser = DefaultSession["user"] & {
  id: string
  role: "ADMIN" | "CUSTOMER"
}

declare module "next-auth" {
  interface Session {
    user: ExtendedUser
  }

  interface User {
    role: "ADMIN" | "CUSTOMER"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "CUSTOMER"
    id?: string
  }
}
