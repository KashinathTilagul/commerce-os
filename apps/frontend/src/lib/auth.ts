import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "./db"
import { compare } from "bcryptjs"
import { TOOLKIT_CATALOG } from "./composio-service"

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    orgRole?: string;
    organizationId?: string;
  }
  interface Session {
    user: User;
  }
}

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
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
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

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() }
        })

        if (!user || !user.password) {
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
          orgRole: user.orgRole || "MEMBER",
          organizationId: user.organizationId || '',
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const persisted = await db.user.findUnique({ where: { id: user.id } })
        token.id = user.id
        token.role = persisted?.role || user.role
        token.orgRole = persisted?.orgRole || user.orgRole
        token.organizationId = persisted?.organizationId || user.organizationId
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.orgRole = token.orgRole as string
        session.user.organizationId = token.organizationId as string
      }
      return session
    }
  },
  events: {
    async createUser({ user }) {
      const persisted = await db.user.findUnique({ where: { id: user.id } })
      if (!persisted || persisted.organizationId) return

      const initialName = user.name?.trim() ? `${user.name.trim()}'s Business` : 'New Business'
      await db.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: initialName,
            slug: `${initialName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}-${Date.now().toString().slice(-6)}`,
          },
        })
        await tx.user.update({
          where: { id: user.id },
          data: { organizationId: organization.id, orgRole: 'FOUNDER' },
        })
        await tx.organizationContext.create({ data: { organizationId: organization.id } })
        await tx.workspace.create({ data: { organizationId: organization.id, title: 'Knowledge Base' } })
        await tx.capability.createMany({
          data: [
            { name: 'brand_intelligence', description: 'Access to Brand Intelligence', category: 'core' },
            { name: 'command_center', description: 'Access to Command Center', category: 'core' },
            { name: 'knowledge_drive', description: 'Access to Knowledge Drive', category: 'core' },
          ].map((capability) => ({ ...capability, organizationId: organization.id, ownerType: 'SYSTEM' })),
        })
        await tx.integration.createMany({
          data: TOOLKIT_CATALOG.map((toolkit) => ({
            organizationId: organization.id,
            toolkitSlug: toolkit.slug,
            name: toolkit.name,
            description: toolkit.description,
            category: toolkit.category,
            logoUrl: toolkit.logo,
            toolsCount: toolkit.toolsCount,
            agentPermissions: '',
          })),
        })
      })
    },
    async signIn(message) {
      console.log(`[AUTH] User signed in: ${message.user?.email}`)
    },
    async signOut(message) {
      console.log(`[AUTH] User signed out`)
    }
  },
  debug: process.env.NODE_ENV === "development",
}
