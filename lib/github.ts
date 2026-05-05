import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getGitHubAccessToken(): Promise<string> {
  const session = await getServerSession(authOptions) as any;
  const token = session?.accessToken;
  if (!token || (session?.provider && session.provider !== "github")) throw new Error("No GitHub access token. Sign in with GitHub again.");
  return token;
}

export async function getProviderAccessToken(provider: "github" | "gitlab"): Promise<string> {
  const session = await getServerSession(authOptions) as any;
  const token = session?.accessToken;
  if (!token || session?.provider !== provider) {
    throw new Error(`No ${provider === "gitlab" ? "GitLab" : "GitHub"} access token. Sign in again.`);
  }
  return token;
}
