import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const suppliers = await db.supplier.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(suppliers)
}
