import { NextAuthOptions } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    provider?: "github" | "gitlab";
    user: {
      login?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token }) {
      return token;
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken;
      session.provider = token.provider;
      session.user.login = token.login;
      return session;
    }
  },
  cookies: {
    sessionToken: {
      name: "__Secure-next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: ".pipery.dev"
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};
