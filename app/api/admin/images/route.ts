import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import ImageKit from 'imagekit';

export const runtime = 'nodejs';

type FirebaseTokenPayload = {
  aud?: unknown;
  exp?: unknown;
  iat?: unknown;
  iss?: unknown;
  sub?: unknown;
  auth_time?: unknown;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getImageKit() {
  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  if (!publicKey || !privateKey || !urlEndpoint) return null;
  return new ImageKit({ publicKey, privateKey, urlEndpoint });
}

function allowedOrigins(request: Request) {
  const origins = new Set([new URL(request.url).origin]);
  const addOrigin = (value: string | null) => {
    if (!value) return;
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' || url.protocol === 'http:') origins.add(url.origin);
    } catch {
      return;
    }
  };

  addOrigin(process.env.URL ?? null);
  addOrigin(process.env.DEPLOY_PRIME_URL ?? null);
  addOrigin(process.env.DEPLOY_URL ?? null);

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0].trim()
    ?? request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim()
    ?? new URL(request.url).protocol.replace(':', '');
  if (forwardedHost) addOrigin(`${forwardedProto}://${forwardedHost}`);

  return origins;
}

async function authorizeOwner(request: Request): Promise<Response | null> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer (.+)$/i)?.[1];
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const ownerEmail = process.env.NEXT_PUBLIC_OWNER_EMAIL?.trim().toLowerCase();

  if (!apiKey || !projectId || !ownerEmail) {
    return jsonError('Image upload authentication is not configured.', 500);
  }
  if (!token || token.length > 8192) return jsonError('Sign in as the site owner to upload images.', 401);

  let payload: FirebaseTokenPayload;
  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return jsonError('Invalid sign-in token.', 401);
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as FirebaseTokenPayload;
  } catch {
    return jsonError('Invalid sign-in token.', 401);
  }

  const now = Math.floor(Date.now() / 1000);
  if (
    payload.aud !== projectId
    || payload.iss !== `https://securetoken.google.com/${projectId}`
    || typeof payload.sub !== 'string'
    || typeof payload.exp !== 'number'
    || payload.exp <= now
    || typeof payload.auth_time !== 'number'
    || payload.auth_time > now + 60
    || now - payload.auth_time >= 3600
  ) {
    return jsonError('Your owner session has expired. Sign in again.', 401);
  }

  let lookupResponse: Response;
  try {
    lookupResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      },
    );
  } catch {
    return jsonError('Could not verify the owner session. Please try again.', 503);
  }

  if (!lookupResponse.ok) return jsonError('Your owner session is invalid. Sign in again.', 401);

  let accountData: unknown;
  try {
    accountData = await lookupResponse.json();
  } catch {
    return jsonError('Could not verify the owner account.', 502);
  }
  if (typeof accountData !== 'object' || accountData === null || !('users' in accountData)) {
    return jsonError('Could not verify the owner account.', 401);
  }
  const users = accountData.users;
  if (!Array.isArray(users) || users.length !== 1) {
    return jsonError('Could not verify the owner account.', 401);
  }
  const account: unknown = users[0];
  if (
    typeof account !== 'object'
    || account === null
    || !('localId' in account)
    || !('email' in account)
    || account.localId !== payload.sub
    || typeof account.email !== 'string'
    || account.email.trim().toLowerCase() !== ownerEmail
  ) {
    return jsonError('Only the configured owner can upload images.', 403);
  }

  const origin = request.headers.get('origin');
  if (origin && !allowedOrigins(request).has(origin)) {
    return jsonError('Cross-origin image requests are not allowed.', 403);
  }

  return null;
}

export async function POST(request: Request) {
  const authError = await authorizeOwner(request);
  if (authError) return authError;

  const imageKit = getImageKit();
  if (!imageKit) return jsonError('ImageKit is not configured on the server.', 500);

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 5 * 1024 * 1024) return jsonError('Choose an image smaller than 5 MB.', 413);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError('Could not read the uploaded image.', 400);
  }

  const file = formData.get('file');
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    return jsonError('Choose a valid image file.', 400);
  }
  if (file.size === 0 || file.size > 5 * 1024 * 1024) {
    return jsonError('Choose an image smaller than 5 MB.', 413);
  }

  const requestedFolder = formData.get('folder');
  if (
    requestedFolder !== null
    && requestedFolder !== 'catalog'
    && requestedFolder !== 'hero'
  ) {
    return jsonError('Choose a supported image folder.', 400);
  }
  const folder = requestedFolder === 'hero' ? '/zateef/hero' : '/zateef/catalog';

  try {
    const uploaded = await imageKit.upload({
      file: Buffer.from(await file.arrayBuffer()),
      fileName: `${randomUUID()}.webp`,
      folder,
      useUniqueFileName: true,
    });
    return Response.json({ url: uploaded.url, fileId: uploaded.fileId });
  } catch (error) {
    console.error('ImageKit image upload failed.', error);
    return jsonError('ImageKit could not upload this image. Please try again.', 502);
  }
}

export async function DELETE(request: Request) {
  const authError = await authorizeOwner(request);
  if (authError) return authError;

  const imageKit = getImageKit();
  if (!imageKit) return jsonError('ImageKit is not configured on the server.', 500);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid image deletion request.', 400);
  }
  if (
    typeof body !== 'object'
    || body === null
    || !('fileId' in body)
    || typeof body.fileId !== 'string'
    || body.fileId.length === 0
    || body.fileId.length > 200
  ) {
    return jsonError('A valid ImageKit file ID is required.', 400);
  }

  try {
    await imageKit.deleteFile(body.fileId);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('ImageKit image deletion failed.', error);
    return jsonError('ImageKit could not delete this image.', 502);
  }
}
