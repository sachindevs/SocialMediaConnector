import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import AuditLog from '@/models/AuditLog';
import { connectDB } from '@/lib/db';
import { Types } from 'mongoose';

type Role = 'admin' | 'agent' | 'supervisor';

interface TenantContext {
  tenantId: string;
  role: string;
  userId: string;
}

type TenantHandler = (req: NextRequest, ctx: TenantContext) => Promise<NextResponse>;

export function withTenant(handler: TenantHandler) {
  return async (req: NextRequest, params?: object): Promise<NextResponse> => {
    const session = await getServerSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(req, {
      tenantId: session.user.tenantId,
      role: session.user.role,
      userId: session.user.userId,
    });
  };
}

export function withRole(requiredRoles: Role[], handler: TenantHandler) {
  return withTenant(async (req, ctx) => {
    if (!requiredRoles.includes(ctx.role as Role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return handler(req, ctx);
  });
}

export async function getTenantId(): Promise<string> {
  const session = await getServerSession();
  if (!session?.user?.tenantId) {
    throw new Error('Not authenticated');
  }
  return session.user.tenantId;
}
