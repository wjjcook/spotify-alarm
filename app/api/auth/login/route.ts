import { NextResponse } from 'next/server';
import spotifyApi, { SCOPES } from '@/lib/spotify';

export async function GET() {
  const authorizeURL = spotifyApi.createAuthorizeURL(SCOPES, 'state-placeholder');
  return NextResponse.redirect(authorizeURL);
}