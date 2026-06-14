/**
 * GSTIN format validation — mirrors the backend app/core/gstin.py.
 * 15 chars: 2-digit state code + 10-char PAN + entity digit + 'Z' + checksum.
 */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;

export function isValidGstin(value: string): boolean {
  return GSTIN_REGEX.test(value.trim().toUpperCase());
}

export function normalizeGstin(value: string): string {
  return value.trim().toUpperCase();
}
