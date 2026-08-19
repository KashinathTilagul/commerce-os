export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { virtualHQFilter, Department } from '@/lib/department-filter'
import { applyRateLimit } from '@/lib/rate-limiter'

export async function GET(request: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(
    `${auth.organizationId}:${auth.user.id}`,
    'API',
    request
  )
  
  if (!rateLimitResult.success && rateLimitResult.errorResponse) {
    const response = NextResponse.json(
      rateLimitResult.errorResponse.body,
      { status: rateLimitResult.errorResponse.status }
    )
    
    Object.entries(rateLimitResult.errorResponse.headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }

  try {
    const { searchParams } = new URL(request.url)
    const filterType = searchParams.get('type') // 'department' or 'workspace'
    const department = searchParams.get('department')?.toUpperCase()
    const workspaceType = searchParams.get('workspace')

    if (filterType === 'department' && department) {
      // Validate department
      if (!Object.values(Department).includes(department as Department)) {
        return NextResponse.json({ error: 'Invalid department' }, { status: 400 })
      }

      const data = await virtualHQFilter.filterByDepartment(
        auth.organizationId,
        department as Department
      )

      return NextResponse.json({
        type: 'department',
        department,
        data,
      })
    } else if (filterType === 'workspace' && workspaceType) {
      const validWorkspaces = ['BOARD_ROOM', 'MISSION_CONTROL', 'FOUNDER_INBOX', 'RISK_CENTER']
      if (!validWorkspaces.includes(workspaceType)) {
        return NextResponse.json({ error: 'Invalid workspace type' }, { status: 400 })
      }

      const data = await virtualHQFilter.filterWorkspace(
        auth.organizationId,
        workspaceType as any
      )

      return NextResponse.json({
        type: 'workspace',
        workspaceType,
        data,
      })
    } else if (filterType === 'overview') {
      // Get all departments overview
      const data = await virtualHQFilter.getAllDepartmentsOverview(auth.organizationId)

      return NextResponse.json({
        type: 'overview',
        data,
      })
    } else {
      return NextResponse.json({ error: 'Invalid filter parameters' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('[VirtualHQ] Error filtering data:', error)
    return NextResponse.json({ error: error.message || 'Failed to filter data' }, { status: 500 })
  }
}