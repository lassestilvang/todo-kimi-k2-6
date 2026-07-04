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
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : null;
        token.provider = account.provider;
        token.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token?.accessToken) session.accessToken = token.accessToken;
      if (token?.refreshToken) session.refreshToken = token.refreshToken;
      if (token?.expiresAt) session.expiresAt = token.expiresAt;
      if (token?.provider) session.provider = token.provider;
      if (token?.user) {
        session.user.id = token.user?.id;
        session.user.name = token.user?.name;
        session.user.email = token.user?.email;
        session.user.image = token.user?.image;
      }
      return session;
    },
  },
});

export const GET = handler;
export const POST = handler;