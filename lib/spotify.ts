import SpotifyWebApi from 'spotify-web-api-node';
import fs from 'fs';
import path from 'path';

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

export const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
];

const tokenPath = path.join(process.cwd(), 'tokens.json');

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  obtained_at: number;
}

function loadTokens(): TokenData | null {
  if (!fs.existsSync(tokenPath)) return null;
  return JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
}

function saveTokens(tokens: TokenData) {
  fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
}

// Ensures spotifyApi has a valid, non-expired access token before use
export async function getValidSpotifyApi(): Promise<SpotifyWebApi> {
  const tokens = loadTokens();
  if (!tokens) {
    throw new Error('No tokens found — visit /api/auth/login first');
  }

  const expiresAt = tokens.obtained_at + tokens.expires_in * 1000;
  const isExpired = Date.now() > expiresAt - 60_000; // refresh 1 min early

  spotifyApi.setAccessToken(tokens.access_token);
  spotifyApi.setRefreshToken(tokens.refresh_token);

  if (isExpired) {
    const data = await spotifyApi.refreshAccessToken();
    const newAccessToken = data.body.access_token;
    spotifyApi.setAccessToken(newAccessToken);

    saveTokens({
      ...tokens,
      access_token: newAccessToken,
      expires_in: data.body.expires_in,
      obtained_at: Date.now(),
    });
  }

  return spotifyApi;
}

export default spotifyApi;
