import * as crypto from 'crypto';

/**
 * Validates the LINE webhook signature to ensure the request is from LINE Platform
 * @param body - The raw request body
 * @param signature - The x-line-signature header value
 * @param channelSecret - The LINE channel secret
 * @returns true if signature is valid, false otherwise
 */
export function validateLineSignature(
  body: string,
  signature: string,
  channelSecret: string
): boolean {
  if (!signature || !channelSecret) {
    return false;
  }

  // Remove 'sha256=' prefix if present
  const cleanSignature = signature.replace('sha256=', '');

  // Create HMAC hash using channel secret
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body, 'utf8')
    .digest('base64');

  // Compare signatures using secure comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(cleanSignature, 'base64'),
    Buffer.from(hash, 'base64')
  );
}

/**
 * Validates that the request came from LINE Platform by checking signature
 * @param request - The Next.js request object
 * @returns Promise<string> - Returns the raw body if valid, throws error if invalid
 */
export async function validateAndGetBody(request: Request): Promise<string> {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelSecret) {
    throw new Error('LINE_CHANNEL_SECRET environment variable is not set');
  }

  const signature = request.headers.get('x-line-signature');

  if (!signature) {
    throw new Error('Missing x-line-signature header');
  }

  const body = await request.text();

  if (!validateLineSignature(body, signature, channelSecret)) {
    throw new Error('Invalid signature - request not from LINE Platform');
  }

  return body;
}