export interface Alarm {
  id: string;
  time: string; // "HH:MM" in 24-hour format, e.g. "07:30"
  days: DayOfWeek[]; // which days this alarm repeats on
  enabled: boolean;
  trackUri: string; // e.g. "spotify:track:xxxx" or "spotify:album:xxxx" or "spotify:playlist:xxxx"
  trackName: string; // for display purposes, so we don't re-fetch from Spotify every time
  deviceId: string; // Spotify Connect device to play on
  deviceName: string; // for display purposes
  volume?: number; // 0-100, optional
}

export type DayOfWeek =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';
  