import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "./db"
import { compare } from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
    signOut: "/logout",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials")
        }

        let user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() }
        })

        if (!user) {
          // Auto-signup for EKVAAR OS
          const { hash } = require('bcryptjs')
          const hashedPassword = await hash(credentials.password, 10)
          user = await db.user.create({
            data: {
              email: credentials.email.toLowerCase().trim(),
              password: hashedPassword,
              name: 'Founder',
              role: 'ADMIN',
            }
          })
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || "ADMIN",
          }
        }

        if (!user.password) {
          throw new Error("Invalid credentials")
        }

        const isValid = await compare(credentials.password, user.password)
        
        if (!isValid) {
          throw new Error("Invalid credentials")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || "USER",
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    }
  },
  events: {
    async signIn(message) {
      console.log(`[AUTH] User signed in: ${message.user?.email}`)
    },
    async signOut(message) {
      console.log(`[AUTH] User signed out`)
    }
  },
  debug: process.env.NODE_ENV === "development",
}
