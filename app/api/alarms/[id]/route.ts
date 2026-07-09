import { NextRequest, NextResponse } from 'next/server';
import { updateAlarm, deleteAlarm, getAlarm } from '@/lib/alarms';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const alarm = getAlarm(params.id);
  if (!alarm) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(alarm);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const updated = updateAlarm(params.id, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const success = deleteAlarm(params.id);
  if (!success) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
