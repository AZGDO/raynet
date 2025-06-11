export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pairs: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = chars[Math.floor(Math.random() * chars.length)];
    const b = chars[Math.floor(Math.random() * chars.length)];
    pairs.push(`${a}${b}`);
  }
  return pairs.join('-');
}
