import { v4 as uuidv4 } from "uuid";
import { cookies } from "next/headers";

const CSRF_TOKEN_NAME = "csrf_token";
const CSRF_HEADER_NAME = "X-CSRF-Token";

/**
 * Generate a cryptographically secure CSRF token using UUID v4.
 * This token should be included in a hidden form field or request header.
 *
 * @returns A unique CSRF token string
 *
 * @example
 * const token = generateCSRFToken();
 * // Store in cookie and send to client
 * await setCSRFToken(token);
 */
export function generateCSRFToken(): string {
  return uuidv4();
}

/**
 * Retrieve the CSRF token from the current request's cookies.
 * Used to validate that the token in the request matches the one stored server-side.
 *
 * @returns The CSRF token from cookies, or null if not found
 */
export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_TOKEN_NAME)?.value || null;
}

/**
 * Set the CSRF token in an HTTP-only cookie for secure storage.
 * The cookie is configured with:
 * - httpOnly: true (prevents JavaScript access)
 * - secure: true in production (HTTPS only)
 * - sameSite: strict (CSRF protection)
 * - maxAge: 30 days
 *
 * @param token - The CSRF token to store
 */
export async function setCSRFToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Validate that the CSRF token in the cookie matches the one in the request header.
 * This provides protection against Cross-Site Request Forgery attacks.
 *
 * @returns true if tokens match, false otherwise
 */
export async function validateCSRFToken(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_TOKEN_NAME)?.value;

  // Get token from header (for API requests)
  const headerToken = cookieStore.get(CSRF_HEADER_NAME)?.value;

  if (!cookieToken || !headerToken) {
    return false;
  }

  return cookieToken === headerToken;
}

/**
 * Middleware function for CSRF protection in API routes.
 * Skips validation for safe HTTP methods (GET, HEAD, OPTIONS).
 * Returns a 403 response if validation fails, null if the request is allowed.
 *
 * @param request - The incoming request object
 * @returns Response object if CSRF check fails, null otherwise
 *
 * @example
 * // In an API route handler
 * export async function POST(request: NextRequest) {
 *   const csrfResponse = await csrfProtection(request);
 *   if (csrfResponse) return csrfResponse;
 *   // Continue with request processing
 * }
 */
export async function csrfProtection(request: Request): Promise<Response | null> {
  // Skip CSRF for safe methods
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return null;
  }

  const cookieToken = (await cookies()).get(CSRF_TOKEN_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return new Response(
      JSON.stringify({ error: "Invalid CSRF token" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return null;
}