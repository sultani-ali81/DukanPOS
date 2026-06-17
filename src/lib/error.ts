export function extractError(
  err: unknown,
  fallback = "An unexpected error occurred.",
): string {
  if (typeof err === "object" && err !== null) {
    // Axios error shape: err.response.data.message
    const response = (err as Record<string, unknown>).response;
    if (typeof response === "object" && response !== null) {
      const data = (response as Record<string, unknown>).data;
      if (typeof data === "object" && data !== null) {
        const msg = (data as Record<string, unknown>).message;
        if (typeof msg === "string" && msg.trim()) return msg;
        // NestJS sometimes returns an array of validation messages
        if (Array.isArray(msg) && msg.length > 0) return msg.join(", ");
      }
      if (typeof data === "string" && data.trim()) return data;
    }
    const message = (err as Record<string, unknown>).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
