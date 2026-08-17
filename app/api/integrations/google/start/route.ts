import { NextResponse } from 'next/server'; import { requireUser } from '@/lib/auth'; import { googleAuthUrl } from '@/lib/integrations';
export async function GET(){ try { const u=await requireUser(); return NextResponse.redirect(googleAuthUrl(u.id)); } catch { return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000')); } }
