import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "@shared/const";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
    if (user && !user.isActive) {
      console.warn('[Auth] Blocked user attempted to access the panel:', user.id);
      opts.res.clearCookie(COOKIE_NAME);
      user = null;
    }
    if (!user) {
      console.log('[Auth] No user found after authentication');
    } else {
      console.log('[Auth] User authenticated:', user.id, user.email);
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    console.error('[Auth] Authentication error:', error instanceof Error ? error.message : String(error));
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
