import * as crypto from 'crypto';

/**
 * Validates the Meta webhook signature to ensure the request is from Meta Platform
 * @param body - The raw request body
 * @param signature - The x-hub-signature-256 header value
 * @param appSecret - The Meta app secret
 * @returns true if signature is valid, false otherwise
 */
export function validateMetaSignature(
  body: string,
  signature: string,
  appSecret: string
): boolean {
  if (!signature || !appSecret) {
    return false;
  }

  // Remove 'sha256=' prefix if present
  const cleanSignature = signature.replace('sha256=', '');

  // Create HMAC hash using app secret
  const hash = crypto
    .createHmac('sha256', appSecret)
    .update(body, 'utf8')
    .digest('hex');

  // Compare signatures using secure comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(cleanSignature, 'hex'),
    Buffer.from(hash, 'hex')
  );
}

/**
 * Validates that the request came from Meta Platform by checking signature
 * @param request - The Next.js request object
 * @returns Promise<string> - Returns the raw body if valid, throws error if invalid
 */
export async function validateAndGetBody(request: Request): Promise<string> {
  const appSecret = process.env.META_APP_SECRET;

  if (!appSecret) {
    throw new Error('META_APP_SECRET environment variable is not set');
  }

  const signature = request.headers.get('x-hub-signature-256');

  if (!signature) {
    throw new Error('Missing x-hub-signature-256 header');
  }

  const body = await request.text();

  if (!validateMetaSignature(body, signature, appSecret)) {
    throw new Error('Invalid signature - request not from Meta Platform');
  }

  return body;
}

/**
 * Validates Meta webhook verification challenge
 * Used for initial webhook setup with Meta
 */
export function validateWebhookChallenge(
  mode: string | null,
  token: string | null,
  challenge: string | null
): string | null {
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    throw new Error('META_WEBHOOK_VERIFY_TOKEN environment variable is not set');
  }

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return challenge;
  }

  return null;
}