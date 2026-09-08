import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-fallback-secret-do-not-use-in-prod'
);
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export async function POST(request) {
  try {
    const { google_token } = await request.json();

    if (!google_token) {
      return NextResponse.json({ error: 'Missing google_token' }, { status: 400 });
    }

    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 });
    }

    // Verify the Google ID token via Google's tokeninfo endpoint
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${google_token}`
    );

    if (!googleRes.ok) {
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
    }

    const googleData = await googleRes.json();

    // Verify the audience matches our client ID
    if (googleData.aud !== GOOGLE_CLIENT_ID) {
      return NextResponse.json({ error: 'Token audience mismatch' }, { status: 401 });
    }

    // Check token expiry
    const now = Math.floor(Date.now() / 1000);
    if (googleData.exp && parseInt(googleData.exp) < now) {
      return NextResponse.json({ error: 'Google token expired' }, { status: 401 });
    }

    const user = {
      id: `google_${googleData.sub}`,
      email: googleData.email,
      name: googleData.name || googleData.email?.split('@')[0] || 'User',
      avatar: googleData.picture || null,
      provider: 'google',
      connectedWallet: null,
      role: 'user',
    };

    // Issue our own JWT
    const token = await new SignJWT({ sub: user.id, email: user.email, role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    return NextResponse.json({ token, user });
  } catch (err) {
    console.error('Google auth error:', err);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
