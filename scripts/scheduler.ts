import cron from 'node-cron';
import { getAlarms } from '../lib/alarms';
import type { DayOfWeek } from '../lib/types';

const triggeredThisMinute = new Set<string>();

function getCurrentDay(): DayOfWeek {
  const days: DayOfWeek[] = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  return days[new Date().getDay()];
}

function getCurrentTime(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

async function checkAlarms() {
  const currentTime = getCurrentTime();
  const currentDay = getCurrentDay();
  const alarms = getAlarms();

  for (const alarm of alarms) {
    if (!alarm.enabled) continue;
    if (alarm.time !== currentTime) continue;
    if (!alarm.days.includes(currentDay)) continue;

    const key = `${alarm.id}-${currentTime}`;
    if (triggeredThisMinute.has(key)) continue;
    triggeredThisMinute.add(key);

    console.log(`Triggering alarm ${alarm.id} at ${currentTime}`);

    try {
      const res = await fetch('http://127.0.0.1:3000/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: alarm.deviceId, trackUri: alarm.trackUri }),
      });
      console.log('Play result:', await res.json());
    } catch (err) {
      console.error('Failed to trigger alarm:', err);
    }
  }
}

// Reset dedupe tracking each new minute
setInterval(() => triggeredThisMinute.clear(), 60_000);

// Check every minute
cron.schedule('* * * * *', checkAlarms);

console.log('Scheduler started — watching for alarms every minute...');
