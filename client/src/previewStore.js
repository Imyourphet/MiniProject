import { createDemoData } from './demoData';
import { transition } from './shuttle';

export const PREVIEW_KEY = 'miniproject_shuttle_preview_v1';
export function readPreview() {
  const raw = localStorage.getItem(PREVIEW_KEY);
  if (!raw) return createDemoData();
  const value = JSON.parse(raw);
  const collections = ['departments', 'positions', 'screens', 'perms', 'routes', 'stops', 'routeStops', 'carTypes', 'carStatuses', 'cars', 'schedules', 'roundStatuses', 'rounds', 'bookingStatuses', 'bookings', 'bookingDetails'];
  if (!value || !collections.every(key => Array.isArray(value[key])) || !Number.isInteger(value.seq)) throw new Error('ข้อมูลตัวอย่างที่บันทึกไว้เสียหาย กรุณารีเซ็ตข้อมูลตัวอย่าง');
  return value;
}
export function updatePreview(action, user, fallback) {
  const current = localStorage.getItem(PREVIEW_KEY) ? readPreview() : fallback;
  const next = transition(current, action, user);
  localStorage.setItem(PREVIEW_KEY, JSON.stringify(next));
  return next;
}