import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    {
      id: 1,
      message: "Maroqli.uz platformasiga xush kelibsiz! Maroqli tangalaringiz bilan o'yinlar va turnirlarda ishtirok eting.",
      is_read: false,
      created_at: new Date().toISOString(),
    }
  ]);
}
