import { NextAuthOptions, getServerSession as nextGetServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { connectDB } from '@/lib/db';
import Tenant from '@/models/Tenant';
import User from '@/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return false;
      if (!user.email) return false;

      await connectDB();

      const emailDomain = user.email.split('@')[1];
      let tenant = await Tenant.findOne({ domain: emailDomain });

      if (!tenant) {
        tenant = await Tenant.create({
          name: emailDomain,
          domain: emailDomain,
          googleWorkspaceDomain: emailDomain,
        });
      }

      const existingUser = await User.findOne({ email: user.email, tenantId: tenant._id });

      if (!existingUser) {
        const isFirstUser = (await User.countDocuments({ tenantId: tenant._id })) === 0;
        await User.create({
          tenantId: tenant._id,
          email: user.email,
          name: user.name,
          image: user.image,
          googleId: account.providerAccountId,
          role: isFirstUser ? 'admin' : 'agent',
          isActive: true,
        });
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (account && user && user.email) {
        await connectDB();
        const emailDomain = user.email.split('@')[1];
        const tenant = await Tenant.findOne({ domain: emailDomain });
        const dbUser = await User.findOne({ email: user.email, tenantId: tenant?._id });

        if (tenant && dbUser) {
          token.tenantId = tenant._id.toString();
          token.role = dbUser.role;
          token.userId = dbUser._id.toString();
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.tenantId = token.tenantId as string;
        session.user.role = token.role as string;
        session.user.userId = token.userId as string;
      }
      return session;
    },
  },
};

export async function getServerSession() {
  return nextGetServerSession(authOptions);
}
