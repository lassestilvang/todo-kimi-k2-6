import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env["GOOGLE_CLIENT_ID"] || "",
      clientSecret: process.env["GOOGLE_CLIENT_SECRET"] || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env["NEXTAUTH_SECRET"] || "fallback-secret-for-development",
  callbacks: {
    async jwt({ token, account, user }: any) {
      if (account?.access_token && user?.id) {
        (token as any).accessToken = account.access_token;
        (token as any).refreshToken = account.refresh_token;
        (token as any).expiresAt = account.expires_at ? account.expires_at * 1000 : null;
        (token as any).provider = account.provider;
        (token as any).user = {
          id: String(user.id),
          name: user.name,
          email: user.email,
          image: user.image,
        };
      }
      return token;
    },
    async session({ session, token }: any) {
      const t = token as any;
      if (t.accessToken) (session as any).accessToken = t.accessToken;
      if (t.refreshToken) (session as any).refreshToken = t.refreshToken;
      if (t.expiresAt) (session as any).expiresAt = t.expiresAt;
      if (t.provider) (session as any).provider = t.provider;
      if (t.user && (session as any).user) {
        const user = t.user as any;
        ((session as any).user as any).id = user?.id;
        ((session as any).user as any).name = user?.name;
        ((session as any).user as any).email = user?.email;
        ((session as any).user as any).image = user?.image;
      }
      return session;
    },
  },
});

export const GET = handler;
export const POST = handler;