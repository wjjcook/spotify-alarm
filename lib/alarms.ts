import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { Alarm } from './types';

const alarmsPath = path.join(process.cwd(), 'alarms.json');

function readAlarms(): Alarm[] {
  if (!fs.existsSync(alarmsPath)) return [];
  const raw = fs.readFileSync(alarmsPath, 'utf-8');
  return raw ? JSON.parse(raw) : [];
}

function writeAlarms(alarms: Alarm[]) {
  fs.writeFileSync(alarmsPath, JSON.stringify(alarms, null, 2));
}

export function getAlarms(): Alarm[] {
  return readAlarms();
}

export function getAlarm(id: string): Alarm | undefined {
  return readAlarms().find((a) => a.id === id);
}

export function createAlarm(data: Omit<Alarm, 'id'>): Alarm {
  const alarms = readAlarms();
  const newAlarm: Alarm = { id: randomUUID(), ...data };
  alarms.push(newAlarm);
  writeAlarms(alarms);
  return newAlarm;
}

export function updateAlarm(id: string, data: Partial<Omit<Alarm, 'id'>>): Alarm | null {
  const alarms = readAlarms();
  const index = alarms.findIndex((a) => a.id === id);
  if (index === -1) return null;

  alarms[index] = { ...alarms[index], ...data };
  writeAlarms(alarms);
  return alarms[index];
}

export function deleteAlarm(id: string): boolean {
  const alarms = readAlarms();
  const filtered = alarms.filter((a) => a.id !== id);
  if (filtered.length === alarms.length) return false;

  writeAlarms(filtered);
  return true;
}
