import { NextResponse } from 'next/server'; import { cookies } from 'next/headers';
export async function POST(){(await cookies()).delete('careerly_session');return NextResponse.redirect(new URL('/login',process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000'));}
