const paths = {
  bus: 'M5 17V5c0-2 14-2 14 0v12M5 11h14M8 7h8M5 17h14M7 17v3m10-3v3M8 14h.01M16 14h.01',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-3a8 8 0 0 1 16 0v3',
  users: 'M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM2 21v-3a8 8 0 0 1 16 0v3M17 4a4 4 0 0 1 0 8m3 3 2 6',
  shield: 'M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7L12 3Zm-4 9 3 3 5-6',
  route: 'M6 3v12a4 4 0 0 0 8 0V9a4 4 0 0 1 8 0v12M3 6l3-3 3 3m10 12 3 3',
  calendar: 'M4 5h16v16H4V5Zm0 5h16M8 3v4m8-4v4',
  chart: 'M4 3v18h17M8 16v-4m5 4V7m5 9v-6',
  qr: 'M3 3h6v6H3V3Zm12 0h6v6h-6V3ZM3 15h6v6H3v-6Zm12 0h3v3h3v3h-6v-6Z',
  flag: 'M5 22V3h14l-3 5 3 5H5',
  ticket: 'M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4V5Zm12 1v3m0 3v3m0 3v1',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 6v6l4 2',
  pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Zm-4 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  check: 'm5 12 4 4L19 6', plus: 'M12 5v14M5 12h14', close: 'm6 6 12 12M6 18 18 6',
  arrow: 'M4 12h16m-6-6 6 6-6 6', back: 'M20 12H4m6-6-6 6 6 6', swap: 'M7 3v18m-4-4 4 4 4-4M17 21V3m-4 4 4-4 4 4',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  info: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v6m0-10v1',
  warning: 'm12 3 10 18H2L12 3Zm0 6v5m0 3v1',
  logout: 'M9 3H3v18h6m-2-9h14m-5-5 5 5-5 5',
  play: 'm8 4 12 8-12 8V4Z', save: 'M4 3h13l4 4v14H3V3h1Zm3 0v7h10V3M7 21v-7h10v7',
};
export default function Icon({ name = 'bus', size = 20, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.bus} /></svg>;
}
