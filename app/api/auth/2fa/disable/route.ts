import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { compare } from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Current password is required to disable 2FA' },
        { status: 400 }
      );
    }

    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    if (!dbUser || !dbUser.passwordHash) {
      return NextResponse.json(
        { error: 'Unable to verify password' },
        { status: 400 }
      );
    }

    const valid = await compare(password, dbUser.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorEnabledAt: null,
      },
    });
    await audit(user.id, 'TWO_FACTOR_DISABLED', 'security');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unable to disable 2FA' },
      { status: 400 }
    );
  }
}
