import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PrintEvent } from '../types';

const PRINT_EVENTS_KEY = 'melisa-terminal:print-events';
const MAX_PRINT_EVENTS = 1000;

function normalizePrintEvents(events: PrintEvent[]): PrintEvent[] {
  if (!Array.isArray(events)) return [];
  return events
    .filter((event) => event && event.id && event.eventType && event.createdAt)
    .map((event) => ({
      ...event,
      bridgeStatus: event.bridgeStatus || 'unknown',
      retryCount: Number.isFinite(event.retryCount) && (event.retryCount || 0) >= 0 ? event.retryCount : 0,
    }))
    .slice(0, MAX_PRINT_EVENTS);
}

async function readPrintEvents(): Promise<PrintEvent[]> {
  try {
    const value = await AsyncStorage.getItem(PRINT_EVENTS_KEY);
    if (!value) return [];
    return normalizePrintEvents(JSON.parse(value) as PrintEvent[]);
  } catch {
    await AsyncStorage.removeItem(PRINT_EVENTS_KEY);
    return [];
  }
}

async function writePrintEvents(events: PrintEvent[]): Promise<void> {
  await AsyncStorage.setItem(PRINT_EVENTS_KEY, JSON.stringify(normalizePrintEvents(events)));
}

export async function loadPrintEvents(): Promise<PrintEvent[]> {
  return readPrintEvents();
}

export async function loadPrintEventsByJob(printJobId: string): Promise<PrintEvent[]> {
  const events = await readPrintEvents();
  return events.filter((event) => event.printJobId === printJobId);
}

export async function addPrintEvent(event: Omit<PrintEvent, 'id' | 'createdAt'> & Partial<Pick<PrintEvent, 'id' | 'createdAt'>>): Promise<PrintEvent> {
  const nextEvent: PrintEvent = {
    ...event,
    id: event.id || `print-event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: event.createdAt || new Date().toISOString(),
    bridgeStatus: event.bridgeStatus || 'unknown',
    retryCount: event.retryCount || 0,
  };
  const events = await readPrintEvents();
  await writePrintEvents([nextEvent, ...events]);
  return nextEvent;
}

export async function clearPrintEvents(): Promise<void> {
  await writePrintEvents([]);
}

export { PRINT_EVENTS_KEY };
