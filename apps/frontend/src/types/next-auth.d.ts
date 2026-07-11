import "next-auth"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    role: string
  }

  interface Session extends DefaultSession {
    user: User & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
  }
}
