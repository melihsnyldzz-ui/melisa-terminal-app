import { Vibration } from 'react-native';
import { loadSettings } from '../storage/localStorage';

type FeedbackKind = 'success' | 'warning' | 'error' | 'message' | 'urgent';
type ScanSoundKind = 'success' | 'error';

const patterns: Record<FeedbackKind, number | number[]> = {
  success: 35,
  warning: 90,
  error: [0, 130, 70, 130],
  message: 45,
  urgent: [0, 120, 80, 120],
};

async function canVibrate(kind: FeedbackKind) {
  try {
    const settings = await loadSettings();
    if (!settings.vibrationEnabled) return false;
    if (kind === 'urgent' && !settings.urgentVibrationEnabled) return false;
    return true;
  } catch {
    return false;
  }
}

async function vibrate(kind: FeedbackKind) {
  if (!(await canVibrate(kind))) return;
  try {
    Vibration.vibrate(patterns[kind]);
  } catch {
    // Cihaz desteklemiyorsa geri bildirim sessizce atlanır.
  }
}

async function canPlayScanSound() {
  try {
    const settings = await loadSettings();
    return settings.scanSoundEnabled !== false;
  } catch {
    return false;
  }
}

async function playWebTone(kind: ScanSoundKind) {
  if (!(await canPlayScanSound())) return;
  try {
    const audioRoot = globalThis as typeof globalThis & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextCtor = audioRoot.AudioContext || audioRoot.webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const duration = kind === 'success' ? 0.09 : 0.16;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(kind === 'success' ? 880 : 220, now);
    if (kind === 'success') oscillator.frequency.exponentialRampToValueAtTime(1180, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === 'success' ? 0.08 : 0.1, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
    setTimeout(() => void context.close(), Math.ceil((duration + 0.05) * 1000));
  } catch {
    // Web preview veya cihaz ses API'si izin vermezse işlem akışı bozulmaz.
  }
}

export function notifySuccess() {
  void vibrate('success');
}

export function notifyWarning() {
  void vibrate('warning');
}

export function notifyError() {
  void vibrate('error');
}

export function notifyMessage() {
  void vibrate('message');
}

export function notifyUrgent() {
  void vibrate('urgent');
}

export function notifyScanSuccess() {
  void playWebTone('success');
  void vibrate('success');
}

export function notifyScanError() {
  void playWebTone('error');
  void vibrate('error');
}
