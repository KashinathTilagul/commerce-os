import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const systems = await db.aISystem.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(systems)
}
