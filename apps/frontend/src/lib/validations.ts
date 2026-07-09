import { z } from "zod"

export const IdSchema = z.string()
  .max(50)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid ID format")

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(30).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
})

export const CustomerSchema = z.object({
  name: z.string().min(1).max(100).transform(s => s.trim()),
  email: z.string().email().max(255).toLowerCase().trim(),
  phone: z.string().max(20).optional(),
  tier: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"]).optional(),
  city: z.string().max(100).optional(),
}).strict()

export const CustomerUpdateSchema = CustomerSchema.partial()

export const ProductSchema = z.object({
  name: z.string().min(1).max(200).transform(s => s.trim()),
  sku: z.string().min(1).max(50).regex(/^[A-Z0-9-]+$/, "SKU must be uppercase alphanumeric with dashes"),
  category: z.string().max(100).optional(),
  price: z.coerce.number().min(0).max(999999.99),
  cost: z.coerce.number().min(0).max(999999.99).optional(),
  stock: z.coerce.number().int().min(0).max(999999).default(0),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED", "OUT_OF_STOCK"]).default("ACTIVE"),
  description: z.string().max(5000).optional(),
}).strict()

export const ProductUpdateSchema = ProductSchema.partial()

export const OrderSchema = z.object({
  customerId: IdSchema,
  status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]).default("PENDING"),
  items: z.array(z.object({
    productId: IdSchema,
    quantity: z.coerce.number().int().min(1).max(100),
    price: z.coerce.number().min(0).max(999999.99).optional(),
  })).min(1).max(100),
  shippingAddress: z.string().max(1000).optional(),
  notes: z.string().max(1000).optional(),
}).strict()

export const OrderUpdateSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]).optional(),
  notes: z.string().max(1000).optional(),
})

export const TransactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "REFUND", "ADJUSTMENT"]),
  category: z.string().max(100),
  amount: z.coerce.number().min(-999999.99).max(999999.99),
  description: z.string().max(500).optional(),
  reference: z.string().max(100).optional(),
  date: z.string().datetime().optional(),
}).strict()

export const IssueSchema = z.object({
  title: z.string().min(3).max(200).transform(s => s.trim()),
  description: z.string().max(5000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  type: z.enum(["BUG", "FEATURE", "IMPROVEMENT", "TASK", "INCIDENT"]).default("TASK"),
  department: z.string().max(100).optional(),
  assigneeId: IdSchema.optional(),
}).strict()

export const IssueUpdateSchema = IssueSchema.partial()

export const IssueCommentSchema = z.object({
  content: z.string().min(1).max(2000).transform(s => s.trim()),
}).strict()

export const ApprovalSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(["PURCHASE", "EXPENSE", "DECISION", "POLICY", "OTHER"]),
  amount: z.coerce.number().min(0).max(99999999.99).optional(),
  requesterId: IdSchema.optional(),
}).strict()

export const ApprovalDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().max(1000).optional(),
})

export const AgentSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["AI", "HUMAN", "SYSTEM"]),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
  description: z.string().max(1000).optional(),
  config: z.record(z.any()).optional(),
}).strict()

export const AgentUpdateSchema = AgentSchema.partial()

export const FounderNoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
}).strict()

export const FounderNoteUpdateSchema = FounderNoteSchema.partial()

export const IntergrationExecuteSchema = z.object({
  toolkit: z.string().min(1).max(50),
  action: z.string().min(1).max(100),
  params: z.record(z.any()).optional(),
}).strict()

export const JarivsChatSchema = z.object({
  message: z.string().min(1).max(10000),
  context: z.record(z.any()).optional(),
  stream: z.boolean().optional(),
}).strict()

export const EventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(["SALE", "MEETING", "DEADLINE", "MILESTONE", "LAUNCH", "OTHER"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  location: z.string().max(200).optional(),
  participants: z.array(IdSchema).max(50).optional(),
}).strict()

export const CampaignSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().max(100),
  status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]),
  budget: z.coerce.number().min(0).max(99999999.99).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  description: z.string().max(5000).optional(),
}).strict()

export const SupplierSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(20).optional(),
  category: z.string().max(100).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]).default("ACTIVE"),
  leadTime: z.coerce.number().int().min(0).max(365).optional(),
  notes: z.string().max(2000).optional(),
}).strict()

export const SettingsSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.any(),
  category: z.string().max(50).optional(),
}).strict()

export const UserSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z.string().min(8).max(128)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["ADMIN", "MANAGER", "USER", "VIEWER"]).default("USER"),
}).strict()

export const LoginSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z.string().min(1).max(128),
}).strict()

export const IdParamSchema = z.object({
  id: IdSchema,
})

export type CustomerInput = z.infer<typeof CustomerSchema>
export type ProductInput = z.infer<typeof ProductSchema>
export type OrderInput = z.infer<typeof OrderSchema>
export type IssueInput = z.infer<typeof IssueSchema>
export type AgentInput = z.infer<typeof AgentSchema>
export type UserInput = z.infer<typeof UserSchema>
