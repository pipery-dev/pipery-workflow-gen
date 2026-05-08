import { PiperyProvider } from "./auth";
import { getProviderSession } from "./provider-session";

export async function getGitHubAccessToken(): Promise<string> {
  const session = await getProviderSession("github");
  const token = session?.accounts?.github?.accessToken || (session?.provider === "github" ? session?.accessToken : undefined);
  if (!token) throw new Error("No GitHub access token. Sign in with GitHub again.");
  return token;
}

export async function getProviderAccessToken(provider: PiperyProvider): Promise<string> {
  const session = await getProviderSession(provider);
  const token = session?.accounts?.[provider]?.accessToken || (session?.provider === provider ? session?.accessToken : undefined);
  if (!token) {
    const label = provider === "gitlab" ? "GitLab" : provider === "bitbucket" ? "Bitbucket" : "GitHub";
    throw new Error(`No ${label} access token. Sign in again.`);
  }
  return token;
}
