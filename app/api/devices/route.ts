import { NextResponse } from 'next/server';
import { getValidSpotifyApi } from '@/lib/spotify';

export async function GET() {
  try {
    const spotifyApi = await getValidSpotifyApi();
    const data = await spotifyApi.getMyDevices();
    return NextResponse.json(data.body.devices);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}
