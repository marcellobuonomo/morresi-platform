/** Colori dell'avatar del collaboratore (sfondo, testo), come i cerchi pastello di Fresha. */
const AVATAR_PALETTE: [string, string][] = [
  ['#EBF8FE', '#0075A8'],
  ['#EBF8FE', '#0075A8'],
  ['#FFF3E5', '#B35C00'],
  ['#FDEDF6', '#A8326E'],
  ['#EBF8FE', '#0075A8'],
  ['#E8F8F4', '#0B7A5F'],
  ['#F1EEFE', '#5B43C9'],
  ['#F0F7E6', '#4E7A12'],
];

export function avatarColors(index: number, calendarColor?: string | null): { bg: string; fg: string } {
  const [bg, fg] = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
  return { bg, fg: calendarColor ?? fg };
}
