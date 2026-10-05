import { userMessage } from "./user-messages";
export type ApiPayload<T = unknown> = {
  data?: T;
  error?: string;
  details?: unknown;
};

export async function readApiPayload<T = unknown>(response: Response): Promise<ApiPayload<T>> {
  const text = await response.text();

  if (!text.trim()) {
    return response.ok
      ? { data: undefined }
      : { error: "We couldn’t complete that request. Please try again." };
  }

  try {
    const payload = JSON.parse(text) as ApiPayload<T>;
    if (payload && typeof payload.error === "string") payload.error = userMessage(payload.error);
    return payload;
  } catch {
    return {
      error: response.ok
        ? "We couldn’t open that response. Please try again."
        : "We couldn’t complete that request. Please try again."
    };
  }
}
