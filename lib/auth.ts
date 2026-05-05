import { NextAuthOptions } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    provider?: "github" | "gitlab";
    accounts?: Record<"github" | "gitlab", { accessToken?: string; login?: string }>;
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
      session.accounts = token.accounts || {};
      session.provider = token.provider;
      session.accessToken =
        session.provider && session.accounts[session.provider]?.accessToken
          ? session.accounts[session.provider].accessToken
          : token.accessToken;
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
