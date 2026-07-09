import { NextRequest, NextResponse } from 'next/server';
import { getAlarms, createAlarm } from '@/lib/alarms';

export async function GET() {
  const alarms = getAlarms();
  return NextResponse.json(alarms);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.time || !body.days || !body.trackUri || !body.deviceId) {
    return NextResponse.json(
      { error: 'time, days, trackUri, and deviceId are required' },
      { status: 400 }
    );
  }

  const alarm = createAlarm({
    time: body.time,
    days: body.days,
    enabled: body.enabled ?? true,
    trackUri: body.trackUri,
    trackName: body.trackName ?? '',
    deviceId: body.deviceId,
    deviceName: body.deviceName ?? '',
    volume: body.volume,
  });

  return NextResponse.json(alarm, { status: 201 });
}
