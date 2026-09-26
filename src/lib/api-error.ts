/**
 * Turn an API error body into user-facing text. The APIs return `{ error: CODE }` and, where useful,
 * a human-readable `message` and/or zod `issues`; raw codes are never shown to users.
 */
export function apiErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const body = data as { message?: unknown; issues?: Array<{ message?: unknown }> };
    if (typeof body.message === "string" && body.message) return body.message;
    const issue = body.issues?.[0]?.message;
    if (typeof issue === "string" && issue) return issue;
  }
  return fallback;
}
