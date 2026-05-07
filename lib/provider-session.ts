import { getServerSession } from "next-auth";
import { authOptionsForProvider, PIPERY_PROVIDERS, PiperyProvider } from "./auth";

export type PiperySession = {
  accessToken?: string;
  provider?: PiperyProvider;
  accounts: Partial<Record<PiperyProvider, { accessToken?: string; login?: string }>>;
  user: {
    login?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
};

export async function getProviderSession(provider: PiperyProvider) {
  return (await getServerSession(authOptionsForProvider(provider))) as PiperySession | null;
}

export async function getPiperySession(): Promise<PiperySession | null> {
  const providerSessions = await Promise.all(
    PIPERY_PROVIDERS.map(async provider => ({
      provider,
      session: await getProviderSession(provider)
    }))
  );

  const accounts: PiperySession["accounts"] = {};
  let activeProvider: PiperyProvider | undefined;
  let user: PiperySession["user"] = {};

  for (const { provider, session } of providerSessions) {
    const account = session?.accounts?.[provider] || (session?.accessToken ? { accessToken: session.accessToken, login: session.user?.login } : undefined);
    if (!account?.accessToken) continue;

    accounts[provider] = account;
    activeProvider = activeProvider || provider;
    user = user.login ? user : session?.user || {};
  }

  if (!Object.keys(accounts).length) {
    return null;
  }

  return {
    provider: activeProvider,
    accessToken: activeProvider ? accounts[activeProvider]?.accessToken : undefined,
    accounts,
    user
  };
}
