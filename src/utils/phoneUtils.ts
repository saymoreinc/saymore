/**
 * Extract country code from phone number
 * Supports common formats like +1, +44, +91, etc.
 */
export function extractCountryCode(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\s/g, '');
  
  // Map of common country codes
  const countryCodeMap: Record<string, string> = {
    '+1': 'US',
    '+44': 'GB',
    '+91': 'IN',
    '+33': 'FR',
    '+49': 'DE',
    '+81': 'JP',
    '+86': 'CN',
    '+61': 'AU',
    '+55': 'BR',
    '+52': 'MX',
    '+34': 'ES',
    '+39': 'IT',
    '+7': 'RU',
    '+82': 'KR',
    '+31': 'NL',
    '+46': 'SE',
    '+47': 'NO',
    '+45': 'DK',
    '+48': 'PL',
    '+90': 'TR',
  };
  
  // Try to match country codes (1-3 digits after +)
  for (const [code, country] of Object.entries(countryCodeMap)) {
    if (cleaned.startsWith(code)) {
      return country;
    }
  }
  
  // Default to US if we can't determine
  return 'US';
}

/**
 * Format phone number for Retell AI API
 */
export function formatPhoneNumberForRetell(phoneNumber: string) {
  const cleaned = phoneNumber.replace(/\s/g, '');
  const countryCode = extractCountryCode(cleaned);
  
  return {
    number: cleaned,
    countryCode: countryCode,
  };
}

