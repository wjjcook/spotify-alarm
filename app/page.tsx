'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Alarm, DayOfWeek } from '@/lib/types';

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'sunday', label: 'S' },
  { key: 'monday', label: 'M' },
  { key: 'tuesday', label: 'T' },
  { key: 'wednesday', label: 'W' },
  { key: 'thursday', label: 'T' },
  { key: 'friday', label: 'F' },
  { key: 'saturday', label: 'S' },
];

const DAY_ORDER: Record<DayOfWeek, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

const COLOR = {
  bg: '#0D0D0F',
  surface: '#171719',
  surfaceBorder: '#262629',
  green: '#1ED760',
  ember: '#FF6B47',
  text: '#F5F5F5',
  muted: '#A7A7A7',
};

function formatDays(days: DayOfWeek[]): string {
  if (days.length === 7) return 'Every day';
  const weekdays: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const weekend: DayOfWeek[] = ['sunday', 'saturday'];
  if (days.length === 5 && weekdays.every(d => days.includes(d))) return 'Weekdays';
  if (days.length === 2 && weekend.every(d => days.includes(d))) return 'Weekends';
  return [...days].sort((a, b) => DAY_ORDER[a] - DAY_ORDER[b]).map(d => d[0].toUpperCase() + d.slice(1, 3)).join(' ');
}

function nextOccurrence(alarm: Alarm): Date | null {
  if (!alarm.enabled || alarm.days.length === 0) return null;
  const [h, m] = alarm.time.split(':').map(Number);
  const now = new Date();
  let soonest: Date | null = null;
  for (const day of alarm.days) {
    const target = new Date(now);
    const diff = (DAY_ORDER[day] - now.getDay() + 7) % 7;
    target.setDate(now.getDate() + diff);
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 7);
    if (!soonest || target < soonest) soonest = target;
  }
  return soonest;
}

function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

interface Device { id: string; name: string; is_active: boolean; }
interface TrackResult { uri: string; name: string; artist: string; }

export default function Home() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [alarmsError, setAlarmsError] = useState<string | null>(null);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null);
  const [now, setNow] = useState(new Date());

  const loadAlarms = useCallback(async () => {
    const res = await fetch('/api/alarms');
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    setAlarms(await res.json());
  }, []);

  const loadDevices = useCallback(async () => {
    const res = await fetch('/api/devices');
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    setDevices(await res.json());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadAlarms();
        if (!cancelled) setAlarmsError(null);
      } catch (e) {
        if (!cancelled) setAlarmsError(e instanceof Error ? e.message : 'Failed to load alarms');
      }
      try {
        await loadDevices();
        if (!cancelled) setDevicesError(null);
      } catch (e) {
        if (!cancelled) setDevicesError(e instanceof Error ? e.message : 'Failed to load devices');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadAlarms, loadDevices]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(tick);
  }, []);

  const toggleAlarm = async (alarm: Alarm) => {
    const previous = alarms;
    setAlarms(prev => prev.map(a => a.id === alarm.id ? { ...a, enabled: !a.enabled } : a));
    const res = await fetch(`/api/alarms/${alarm.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !alarm.enabled }),
    });
    if (!res.ok) {
      setAlarms(previous); // revert on failure
      console.error('Failed to toggle alarm:', res.status);
    }
  };

  const removeAlarm = async (id: string) => {
    const previous = alarms;
    setAlarms(prev => prev.filter(a => a.id !== id));
    const res = await fetch(`/api/alarms/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setAlarms(previous); // revert on failure
      console.error('Failed to delete alarm:', res.status);
    }
  };

  const openNewForm = () => { setEditingAlarm(null); setFormOpen(true); };
  const openEditForm = (alarm: Alarm) => { setEditingAlarm(alarm); setFormOpen(true); };

  const upcoming = alarms
    .map(a => ({ alarm: a, date: nextOccurrence(a) }))
    .filter((x): x is { alarm: Alarm; date: Date } => x.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  const msRemaining = upcoming ? upcoming.date.getTime() - now.getTime() : null;
  const arcFill = msRemaining !== null ? 1 - Math.min(msRemaining / (12 * 3600 * 1000), 1) : 0;
  const circumference = 2 * Math.PI * 88;

  return (
    <main className="min-h-screen px-6 py-12 md:px-12" style={{ background: COLOR.bg, color: COLOR.text }}>
      <div className="mx-auto max-w-2xl">

        {devicesError && (
          <div
            className="mb-6 rounded-xl px-4 py-3 text-sm"
            style={{ background: '#2A1A15', color: COLOR.ember, border: `1px solid ${COLOR.ember}44` }}
          >
            Couldn&apos;t load Spotify devices ({devicesError}). Make sure Spotify is open and you&apos;re
            logged in — try <a href="/api/auth/login" className="underline">logging in again</a>.
          </div>
        )}
        {alarmsError && (
          <div
            className="mb-6 rounded-xl px-4 py-3 text-sm"
            style={{ background: '#2A1A15', color: COLOR.ember, border: `1px solid ${COLOR.ember}44` }}
          >
            Couldn&apos;t load alarms ({alarmsError}).
          </div>
        )}

        <section className="mb-14 flex flex-col items-center text-center">
          <div className="relative mb-6 h-48 w-48">
            <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
              <circle cx="100" cy="100" r="88" fill="none" stroke={COLOR.surface} strokeWidth="8" />
              <circle
                cx="100" cy="100" r="88" fill="none"
                stroke={COLOR.ember}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - arcFill)}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {loading ? (
                <span className="text-sm" style={{ color: COLOR.muted }}>Loading…</span>
              ) : upcoming ? (
                <>
                  <span className="text-4xl" style={{ fontFamily: 'var(--font-fraunces)' }}>
                    {formatCountdown(msRemaining!)}
                  </span>
                  <span className="mt-1 text-xs uppercase tracking-widest" style={{ color: COLOR.muted }}>
                    until wake
                  </span>
                </>
              ) : (
                <span className="text-sm" style={{ color: COLOR.muted }}>No alarms set</span>
              )}
            </div>
          </div>
          {upcoming && (
            <p className="text-sm" style={{ color: COLOR.muted }}>
              {upcoming.date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              {' · '}
              {upcoming.alarm.trackName || 'Untitled track'}
            </p>
          )}
        </section>

        <section className="mb-8 flex items-center justify-between">
          <h1 className="text-lg font-medium" style={{ fontFamily: 'var(--font-fraunces)' }}>Alarms</h1>
          <button
            onClick={openNewForm}
            className="rounded-full px-4 py-2 text-sm font-semibold transition hover:opacity-90"
            style={{ background: COLOR.green, color: '#04140A' }}
          >
            + New alarm
          </button>
        </section>

        {loading ? (
          <p style={{ color: COLOR.muted }}>Loading…</p>
        ) : alarms.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-12 text-center" style={{ borderColor: COLOR.surfaceBorder }}>
            <p style={{ color: COLOR.muted }}>No alarms yet. Set one to wake up to something you actually like.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {[...alarms].sort((a, b) => a.time.localeCompare(b.time)).map(alarm => (
              <li
                key={alarm.id}
                className="flex items-center justify-between rounded-2xl px-5 py-4"
                style={{ background: COLOR.surface, opacity: alarm.enabled ? 1 : 0.5 }}
              >
                <button onClick={() => openEditForm(alarm)} className="flex-1 text-left">
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl tabular-nums" style={{ fontFamily: 'var(--font-plex-mono)' }}>
                      {alarm.time}
                    </span>
                    <span className="text-sm" style={{ color: COLOR.muted }}>{formatDays(alarm.days)}</span>
                  </div>
                  <p className="mt-1 truncate text-sm" style={{ color: COLOR.muted }}>
                    {alarm.trackName || 'No track selected'} · {alarm.deviceName || 'No device'}
                  </p>
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleAlarm(alarm)}
                    className="relative h-7 w-12 rounded-full transition"
                    style={{ background: alarm.enabled ? COLOR.green : COLOR.surfaceBorder }}
                    aria-label={alarm.enabled ? 'Disable alarm' : 'Enable alarm'}
                  >
                    <span
                      className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all"
                      style={{ left: alarm.enabled ? '26px' : '4px' }}
                    />
                  </button>
                  <button
                    onClick={() => removeAlarm(alarm.id)}
                    className="text-sm"
                    style={{ color: COLOR.muted }}
                    aria-label="Delete alarm"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formOpen && (
        <AlarmForm
          alarm={editingAlarm}
          devices={devices}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); loadAlarms(); }}
        />
      )}
    </main>
  );
}

function AlarmForm({
  alarm, devices, onClose, onSaved,
}: {
  alarm: Alarm | null;
  devices: Device[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [time, setTime] = useState(alarm?.time ?? '07:30');
  const [days, setDays] = useState<DayOfWeek[]>(alarm?.days ?? []);
  const [deviceId, setDeviceId] = useState(alarm?.deviceId ?? '');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TrackResult[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<TrackResult | null>(
    alarm ? { uri: alarm.trackUri, name: alarm.trackName, artist: '' } : null
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const handle = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      setResults(await res.json());
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  const toggleDay = (day: DayOfWeek) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const save = async () => {
    if (!selectedTrack || !deviceId || days.length === 0) return;
    setSaving(true);
    const device = devices.find(d => d.id === deviceId);
    const payload = {
      time, days, enabled: alarm?.enabled ?? true,
      trackUri: selectedTrack.uri,
      trackName: `${selectedTrack.name}${selectedTrack.artist ? ' · ' + selectedTrack.artist : ''}`,
      deviceId, deviceName: device?.name ?? '',
    };
    if (alarm) {
      await fetch(`/api/alarms/${alarm.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/alarms', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6 md:rounded-3xl"
        style={{ background: COLOR.surface, border: `1px solid ${COLOR.surfaceBorder}` }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="mb-6 text-lg font-medium" style={{ fontFamily: 'var(--font-fraunces)' }}>
          {alarm ? 'Edit alarm' : 'New alarm'}
        </h2>

        <label className="mb-1 block text-xs uppercase tracking-widest" style={{ color: COLOR.muted }}>Time</label>
        <input
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
          className="mb-5 w-full rounded-xl px-4 py-3 text-lg"
          style={{ background: COLOR.bg, color: COLOR.text, fontFamily: 'var(--font-plex-mono)' }}
        />

        <label className="mb-2 block text-xs uppercase tracking-widest" style={{ color: COLOR.muted }}>Repeat</label>
        <div className="mb-5 flex gap-2">
          {DAYS.map(d => (
            <button
              key={d.key}
              onClick={() => toggleDay(d.key)}
              className="h-9 w-9 rounded-full text-sm font-medium transition"
              style={{
                background: days.includes(d.key) ? COLOR.green : COLOR.bg,
                color: days.includes(d.key) ? '#04140A' : COLOR.muted,
              }}
            >
              {d.label}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-xs uppercase tracking-widest" style={{ color: COLOR.muted }}>Song</label>
        {selectedTrack ? (
          <div className="mb-2 flex items-center justify-between rounded-xl px-4 py-3" style={{ background: COLOR.bg }}>
            <span className="truncate text-sm">
              {selectedTrack.name}{selectedTrack.artist ? ` · ${selectedTrack.artist}` : ''}
            </span>
            <button onClick={() => setSelectedTrack(null)} className="text-xs" style={{ color: COLOR.muted }}>
              Change
            </button>
          </div>
        ) : (
          <>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search a song…"
              className="mb-2 w-full rounded-xl px-4 py-3 text-sm"
              style={{ background: COLOR.bg, color: COLOR.text }}
            />
            {results.length > 0 && (
              <ul className="mb-2 max-h-48 overflow-y-auto rounded-xl" style={{ background: COLOR.bg }}>
                {results.map(track => (
                  <li key={track.uri}>
                    <button
                      onClick={() => { setSelectedTrack(track); setQuery(''); setResults([]); }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-white/5"
                    >
                      <span className="truncate">{track.name} · {track.artist}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <label className="mb-1 mt-3 block text-xs uppercase tracking-widest" style={{ color: COLOR.muted }}>Play on</label>
        <select
          value={deviceId}
          onChange={e => setDeviceId(e.target.value)}
          className="mb-6 w-full rounded-xl px-4 py-3 text-sm"
          style={{ background: COLOR.bg, color: COLOR.text }}
        >
          <option value="">Select a device…</option>
          {devices.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-full py-3 text-sm" style={{ background: COLOR.bg, color: COLOR.muted }}>
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !selectedTrack || !deviceId || days.length === 0}
            className="flex-1 rounded-full py-3 text-sm font-semibold disabled:opacity-40"
            style={{ background: COLOR.green, color: '#04140A' }}
          >
            {saving ? 'Saving…' : 'Save alarm'}
          </button>
        </div>
      </div>
    </div>
  );
}
