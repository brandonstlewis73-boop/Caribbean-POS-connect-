import { NextResponse } from "next/server";
import { userMessage } from "./user-messages";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function fail(message: string, status = 400, details?: unknown) {
  const safeMessage = userMessage(message);
  return NextResponse.json({ error: safeMessage, details: safeMessage === message ? details : undefined }, { status });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("Invalid JSON body");
  }
}
