import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getGitHubAccessToken(): Promise<string> {
  const session = await getServerSession(authOptions) as any;
  const token = session?.accessToken;
  if (!token) throw new Error("No GitHub access token. Sign in again.");
  return token;
}
