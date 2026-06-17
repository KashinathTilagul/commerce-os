import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const restorations = await db.restoration.findMany({ orderBy: { requestedAt: 'desc' } })
  return NextResponse.json(restorations)
}
