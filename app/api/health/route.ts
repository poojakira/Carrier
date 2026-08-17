import { NextResponse } from 'next/server'; import { db } from '@/lib/db';
export async function GET(){try{await db.$queryRaw`SELECT 1`;return NextResponse.json({ok:true,database:'ok',time:new Date().toISOString()});}catch{return NextResponse.json({ok:false,database:'error'},{status:503});}}
