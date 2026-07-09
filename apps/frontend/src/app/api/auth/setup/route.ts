import { db } from "@/lib/db"
import { hash } from "bcrypt"
import { createApiResponse, createApiError } from "@/lib/security"

export async function POST() {
  const existingAdmin = await db.user.findUnique({ where: { email: "admin@ekvaar.com" } })
  
  if (existingAdmin) {
    return createApiResponse({ message: "Admin user already exists", email: "admin@ekvaar.com" })
  }

  const hashedPassword = await hash("ChangeMe123!", 12)
  
  const user = await db.user.create({
    data: {
      email: "admin@ekvaar.com",
      password: hashedPassword,
      name: "Admin",
      role: "ADMIN",
    },
  })

  return createApiResponse({ 
    message: "Admin user created. Please change the password immediately.",
    email: "admin@ekvaar.com",
    id: user.id 
  })
}
