import NextAuth from 'next-auth/types';

declare module 'next-auth' {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      tenantId: string;
      role: string;
      userId: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    tenantId?: string;
    role?: string;
    userId?: string;
  }
}
