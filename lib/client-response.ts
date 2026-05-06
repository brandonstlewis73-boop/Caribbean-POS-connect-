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
      : { error: `Request failed with status ${response.status}.` };
  }

  try {
    return JSON.parse(text) as ApiPayload<T>;
  } catch {
    return {
      error: response.ok
        ? "The server returned a response this page could not read."
        : "The server returned an unexpected error response."
    };
  }
}
