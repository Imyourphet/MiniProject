import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDemoData, todayISO, addDays, BS, RS } from '../src/lib/demoData.js';
import { transition, seatsLeft, passengerStops } from '../src/lib/shuttle.js';
const admin = { userId: 'U001', posId: 'P1' }, passenger = { userId: 'U005', posId: 'P3' }, driver = { userId: 'U002', posId: 'P2' };
const run = (data, type, payload, user = admin) => transition(data, { type, payload }, user);

test('booking is atomic, validates capacity and preserves original state', () => {
  const data = createDemoData(), round = data.rounds.find(r => r.date === addDays(todayISO(), 1));
  const item = { roundId: round.id, originStopId: 'S001', destStopId: 'S002', seats: 2 };
  const before = seatsLeft(data, round.id);
  const next = run(data, 'book', { items: [item, item] }, passenger);
  assert.equal(seatsLeft(next, round.id), before - 4);
  assert.equal(seatsLeft(data, round.id), before);
  assert.equal(new Set(next.bookingDetails.map(d => d.qrcode)).size, next.bookingDetails.length);
  assert.throws(() => run(data, 'book', { items: Array(20).fill(item) }, passenger), /ที่นั่งไม่เพียงพอ/);
  assert.throws(() => run(data, 'book', { items: [{ ...item, seats: -1 }] }, passenger));
  assert.throws(() => run(data, 'book', { items: [{ ...item, destStopId: 'S001' }] }, passenger));
});
test('ownership and state transitions prevent duplicate scans and closing other drivers rounds', () => {
  let data = createDemoData();
  const detail = data.bookingDetails.find(d => d.qrcode === 'QR-B00001-1');
  assert.throws(() => run(data, 'checkIn', { roundId: detail.roundId, code: detail.qrcode }, driver));
  data = run(data, 'start', { roundId: detail.roundId }, driver);
  assert.throws(() => run(data, 'start', { roundId: detail.roundId }, driver));
  data = run(data, 'checkIn', { roundId: detail.roundId, code: detail.qrcode }, driver);
  assert.throws(() => run(data, 'checkIn', { roundId: detail.roundId, code: detail.qrcode }, driver));
  assert.throws(() => run(data, 'close', { roundId: detail.roundId }, { userId: 'U003', posId: 'P2' }));
  assert.throws(() => run(data, 'cancelBooking', { bookingId: detail.bookingId, seq: detail.seq }, passenger));
  data = run(data, 'close', { roundId: detail.roundId }, driver);
  assert.equal(data.rounds.find(r => r.id === detail.roundId).statusId, RS.CLOSED);
  assert.equal(data.bookingDetails.find(d => d.qrcode === detail.qrcode).statusId, BS.DONE);
});
test('cancellation is owned and opening rounds is idempotent', () => {
  const data = createDemoData(), detail = data.bookingDetails[0];
  assert.throws(() => run(data, 'cancelBooking', { bookingId: detail.bookingId, seq: detail.seq }, { userId: 'U006', posId: 'P3' }));
  const next = run(data, 'cancelBooking', { bookingId: detail.bookingId, seq: detail.seq }, passenger);
  assert.equal(next.bookingDetails[0].statusId, BS.CANCEL);
  const opened = run(data, 'openRounds', { date: todayISO(), days: 7 });
  assert.equal(run(opened, 'openRounds', { date: todayISO(), days: 7 }).rounds.length, opened.rounds.length);
});
test('schedule conflicts, referenced deletes and management permissions are enforced', () => {
  const data = createDemoData();
  assert.throws(() => run(data, 'addSchedule', { time: '09:30', routeId: '0001', carId: '03', empId: 'U002' }), /ซ้อน/);
  assert.throws(() => run(data, 'deleteMaster', { collection: 'routes', id: '0001' }));
  assert.throws(() => run(data, 'deleteMaster', { collection: 'cars', id: '03' }));
  assert.throws(() => run(data, 'deleteSchedule', { id: '001' }));
  assert.throws(() => run(data, 'permission', { posId: 'P1', screenId: 'SC01', on: false }));
  assert.throws(() => run(data, 'openRounds', { date: todayISO(), days: 1 }, passenger));
  assert.equal(data.employees, undefined, 'The client seed must never contain login accounts/passwords');
});

test('repeated stops use the boarding/alighting sequence only once', () => {
  const data = createDemoData();
  assert.deepEqual(passengerStops(data, '0001', { originStopId: 'S001', destStopId: 'S002' }), { originSeq: 1, destSeq: 2 });
  assert.deepEqual(passengerStops(data, '0001', { originStopId: 'S002', destStopId: 'S001' }), { originSeq: 2, destSeq: 7 });
});

test('closing a round marks passengers who did not board as no-show', () => {
  let data = createDemoData();
  const roundId = data.bookingDetails[0].roundId;
  data = run(data, 'start', { roundId }, driver);
  data = run(data, 'close', { roundId }, driver);
  assert.equal(data.bookingDetails[0].statusId, BS.NOSHOW);
});
