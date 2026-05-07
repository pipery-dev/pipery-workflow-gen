import { NextAuthOptions } from "next-auth";

export type PiperyProvider = "github" | "gitlab" | "bitbucket";
export const PIPERY_PROVIDERS: PiperyProvider[] = ["github", "gitlab", "bitbucket"];
const DEFAULT_SESSION_COOKIE_PREFIX = "__Secure-pipery-auth";

export function providerSessionCookieName(provider: PiperyProvider) {
  return `${process.env.PIPERY_AUTH_SESSION_COOKIE_PREFIX || DEFAULT_SESSION_COOKIE_PREFIX}.${provider}.session-token`;
}

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    provider?: PiperyProvider;
    accounts?: Record<PiperyProvider, { accessToken?: string; login?: string }>;
    user: {
      login?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

export function authOptionsForProvider(provider: PiperyProvider = "github"): NextAuthOptions {
  return {
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
        name: providerSessionCookieName(provider),
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
}

export const authOptions = authOptionsForProvider("github");
