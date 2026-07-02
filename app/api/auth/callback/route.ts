import { NextRequest, NextResponse } from 'next/server';
import spotifyApi from '@/lib/spotify';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    // For now: store tokens in a local JSON file (fine for personal/single-user use)
    const tokenPath = path.join(process.cwd(), 'tokens.json');
    fs.writeFileSync(
      tokenPath,
      JSON.stringify({ access_token, refresh_token, expires_in, obtained_at: Date.now() }, null, 2)
    );

    return NextResponse.json({ message: 'Successfully authenticated! Tokens saved.' });
  } catch (error) {
    console.error('Error during authorization:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}