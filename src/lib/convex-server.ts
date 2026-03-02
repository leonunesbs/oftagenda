import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

export function getConvexHttpClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("Convex URL is not configured.");
  }

  return new ConvexHttpClient(url);
}

export async function getAuthenticatedConvexHttpClient() {
  const { userId, getToken } = await auth();
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const token = await getToken({ template: "convex" });
  if (!token) {
    throw new Error("Missing Convex token from Clerk template 'convex'.");
  }

  const client = getConvexHttpClient();
  client.setAuth(token);
  return { client, userId };
}
