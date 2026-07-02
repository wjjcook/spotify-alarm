import { NextRequest, NextResponse } from 'next/server';
import { getValidSpotifyApi } from '@/lib/spotify';

export async function POST(request: NextRequest) {
  try {
    const { deviceId, trackUri } = await request.json();

    if (!deviceId || !trackUri) {
      return NextResponse.json(
        { error: 'deviceId and trackUri are required' },
        { status: 400 }
      );
    }

    const spotifyApi = await getValidSpotifyApi();

    // Transfer playback to the target device and start playing
    await spotifyApi.play({
      device_id: deviceId,
      uris: [trackUri],
    });

    return NextResponse.json({ message: 'Playback started' });
  } catch (error) {
    console.error('Error starting playback:', error);
    return NextResponse.json({ error: 'Failed to start playback' }, { status: 500 });
  }
}
