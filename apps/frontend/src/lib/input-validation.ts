import { z } from 'zod'

// Common validation schemas
export const CommonSchemas = {
  // ID validation
  cuid: z.string().cuid(),
  
  // Pagination
  pagination: z.object({
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
  }),
  
  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
  
  // Sorting
  sort: z.object({
    field: z.string().optional(),
    direction: z.enum(['asc', 'desc']).default('desc'),
  }),
  
  // Search
  search: z.object({
    query: z.string().min(1).max(100).optional(),
    fields: z.array(z.string()).optional(),
  }),
}

// Security validation schemas
export const SecuritySchemas = {
  // Sanitize string input (remove potential XSS)
  sanitizeString: z.string().transform((val) => {
    // Basic XSS prevention
    return val
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
      .trim()
  }),
  
  // Validate email
  email: z.string().email(),
  
  // Validate URL
  url: z.string().url(),
  
  // Validate phone number (basic)
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number'),
  
  // Validate content length
  contentLength: (min: number, max: number) => 
    z.string().min(min).max(max),
  
  // Validate numeric range
  numericRange: (min: number, max: number) =>
    z.number().min(min).max(max),
}

// Business-specific validation schemas
export const BusinessSchemas = {
  // Agent validation
  agent: z.object({
    name: z.string().min(2).max(100),
    code: z.string().min(2).max(20).regex(/^[A-Z0-9_]+$/, 'Agent code must be uppercase letters, numbers, and underscores'),
    role: z.string().min(2).max(50),
    department: z.enum(['EXECUTIVE', 'CREATIVE', 'MARKETING', 'TECHNOLOGY', 'FINANCE', 'OPERATIONS', 'SALES', 'HUMAN_RESOURCES']).optional(),
    description: z.string().max(500).optional(),
    avatarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }),
  
  // Issue validation
  issue: z.object({
    title: z.string().min(3).max(200),
    description: z.string().min(10).max(10000),
    priority: z.enum(['P0', 'P1', 'P2', 'P3']),
    department: z.enum(['EXECUTIVE', 'CREATIVE', 'MARKETING', 'TECHNOLOGY', 'FINANCE', 'OPERATIONS', 'SALES', 'HUMAN_RESOURCES']),
    assignedAgentId: z.string().cuid().optional(),
    dueDate: z.string().datetime().optional(),
  }),
  
  // Campaign validation
  campaign: z.object({
    name: z.string().min(3).max(200),
    description: z.string().min(10).max(5000),
    department: z.enum(['EXECUTIVE', 'CREATIVE', 'MARKETING', 'TECHNOLOGY', 'FINANCE', 'OPERATIONS', 'SALES', 'HUMAN_RESOURCES']),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    budget: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, 'Invalid budget format').optional(),
  }),
  
  // Approval validation
  approval: z.object({
    title: z.string().min(3).max(200),
    description: z.string().min(10).max(5000),
    priority: z.enum(['P0', 'P1', 'P2', 'P3']),
    launchId: z.string().cuid().optional(),
    revisionId: z.string().cuid().optional(),
  }),
  
  // Goal validation
  goal: z.object({
    title: z.string().min(3).max(200),
    description: z.string().min(10).max(5000),
    targetDate: z.string().datetime(),
    department: z.enum(['EXECUTIVE', 'CREATIVE', 'MARKETING', 'TECHNOLOGY', 'FINANCE', 'OPERATIONS', 'SALES', 'HUMAN_RESOURCES']),
    targetValue: z.number().optional(),
    currentProgress: z.number().min(0).max(100).default(0),
  }),
}

// Input validation middleware
export class InputValidator {
  /**
   * Validate request body against schema
   */
  static validateBody<T>(schema: z.ZodSchema<T>) {
    return async (request: Request): Promise<{ success: true; data: T } | { success: false; error: string; status: number }> => {
      try {
        const body = await request.json()
        const result = schema.safeParse(body)
        
        if (!result.success) {
          const errorMessage = result.error.issues[0]?.message || 'Invalid input'
          return {
            success: false,
            error: errorMessage,
            status: 400,
          }
        }
        
        return { success: true, data: result.data }
      } catch (error) {
        return {
          success: false,
          error: 'Invalid JSON in request body',
          status: 400,
        }
      }
    }
  }

  /**
   * Validate query parameters
   */
  static validateQuery<T>(schema: z.ZodSchema<T>, queryString: string) {
    try {
      const params = new URLSearchParams(queryString)
      const obj = Object.fromEntries(params.entries())
      const result = schema.safeParse(obj)
      
      if (!result.success) {
        return {
          success: false,
          error: result.error.issues[0]?.message || 'Invalid query parameters',
        }
      }
      
      return { success: true, data: result.data }
    } catch (error) {
      return {
        success: false,
        error: 'Invalid query string',
      }
    }
  }

  /**
   * Sanitize and validate user input
   */
  static sanitizeInput(input: string, maxLength: number = 1000): string {
    return SecuritySchemas.sanitizeString.parse(input.substring(0, maxLength))
  }

  /**
   * Validate ID parameter
   */
  static validateId(id: string): { success: boolean; error?: string } {
    const result = CommonSchemas.cuid.safeParse(id)
    if (!result.success) {
      return {
        success: false,
        error: 'Invalid ID format',
      }
    }
    return { success: true }
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(params: any) {
    const result = CommonSchemas.pagination.safeParse(params)
    if (!result.success) {
      return {
        success: false,
        error: result.error.issues[0]?.message || 'Invalid pagination parameters',
      }
    }
    return { success: true, data: result.data }
  }
}

// Helper function for API routes
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  const validation = InputValidator.validateBody(schema)(request)
  const result = await validation
  
  if (!result.success) {
    const { NextResponse } = await import('next/server')
    return {
      success: false,
      response: NextResponse.json(
        { error: result.error },
        { status: result.status }
      ),
    }
  }
  
  return { success: true, data: result.data }
}

// Validation for specific API endpoints
export const EndpointValidation = {
  // Approvals endpoint
  createApproval: BusinessSchemas.approval,
  updateApproval: z.object({
    status: z.enum(['APPROVED', 'REJECTED', 'REVISION_REQUESTED']),
    note: z.string().max(2000).optional(),
  }),
  
  // Issues endpoint
  createIssue: BusinessSchemas.issue,
  updateIssue: z.object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().min(10).max(10000).optional(),
    status: z.enum(['BACKLOG', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
    priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
    assignedAgentId: z.string().cuid().optional(),
  }),
  
  // Agents endpoint
  createAgent: BusinessSchemas.agent,
  updateAgent: z.object({
    name: z.string().min(2).max(100).optional(),
    role: z.string().min(2).max(50).optional(),
    department: z.enum(['EXECUTIVE', 'CREATIVE', 'MARKETING', 'TECHNOLOGY', 'FINANCE', 'OPERATIONS', 'SALES', 'HUMAN_RESOURCES']).optional(),
    description: z.string().max(500).optional(),
    avatarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }),
  
  // Campaigns endpoint
  createCampaign: BusinessSchemas.campaign,
  updateCampaign: z.object({
    name: z.string().min(3).max(200).optional(),
    description: z.string().min(10).max(5000).optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    budget: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).optional(),
  }),
}