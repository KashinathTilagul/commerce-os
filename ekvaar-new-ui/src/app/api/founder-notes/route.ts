import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const notes = await db.founderNote.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(notes)
}
