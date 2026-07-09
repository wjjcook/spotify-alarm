import { NextRequest, NextResponse } from 'next/server';
import { getValidSpotifyApi } from '@/lib/spotify';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q) return NextResponse.json([]);

  try {
    const spotifyApi = await getValidSpotifyApi();
    const data = await spotifyApi.searchTracks(q, { limit: 8 });
    const tracks = (data.body.tracks?.items ?? []).map(t => ({
      uri: t.uri,
      name: t.name,
      artist: t.artists.map(a => a.name).join(', '),
    }));
    return NextResponse.json(tracks);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
