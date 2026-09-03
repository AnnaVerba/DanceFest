// Seeded admins get a placeholder phone `admin:<uuid>` and log in by
// email; the OTP flow only applies to real phone numbers.
const SEED_PHONE_PREFIX = 'admin:';
const VISIBLE_TAIL = 2;
const VISIBLE_HEAD = 4;

export function isRealPhone(phone: string): boolean {
  return !!phone && !phone.startsWith(SEED_PHONE_PREFIX);
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\s+/g, '');
  if (digits.length <= VISIBLE_HEAD + VISIBLE_TAIL) return digits;
  const head = digits.slice(0, VISIBLE_HEAD);
  const tail = digits.slice(-VISIBLE_TAIL);
  const hidden = '•'.repeat(digits.length - VISIBLE_HEAD - VISIBLE_TAIL);
  return `${head}${hidden}${tail}`;
}
