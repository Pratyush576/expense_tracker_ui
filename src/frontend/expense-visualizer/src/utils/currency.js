export const currencySymbols = {
  USD: '$', // United States Dollar
  EUR: '€', // Euro
  JPY: '¥', // Japanese Yen
  GBP: '£', // British Pound Sterling
  INR: '₹', // Indian Rupee
  AUD: 'A$', // Australian Dollar
  CAD: 'C$', // Canadian Dollar
  CHF: 'CHF', // Swiss Franc
  CNY: '¥', // Chinese Yuan
  SEK: 'kr', // Swedish Krona
  NZD: 'NZ$', // New Zealand Dollar
};

export const getCurrencySymbol = (currencyCode) => {
  return currencySymbols[currencyCode] || '$';
};

export const formatCurrency = (amount, currencyCode) => {
  const symbol = getCurrencySymbol(currencyCode);
  // console.log(typeof amount);
  return `${symbol}${amount.toFixed(2)}`;
};

export const getFlagEmoji = (currencyCode) => {
  // Basic mapping from currency code to country code (ISO 3166-1 alpha-2)
  // This is a simplified mapping and might not cover all cases or be perfectly accurate
  const countryCodeMap = {
    USD: 'US',
    EUR: 'EU', // European Union flag
    JPY: 'JP',
    GBP: 'GB',
    INR: 'IN',
    AUD: 'AU',
    CAD: 'CA',
    CHF: 'CH',
    CNY: 'CN',
    SEK: 'SE',
    NZD: 'NZ',
  };

  const countryCode = countryCodeMap[currencyCode];
  if (!countryCode) {
    return ''; // Return empty string if no mapping found
  }

  // Convert country code to flag emoji
  // This uses the regional indicator symbol letters
  const FLAG_OFFSET = 0x1F1E6; // Regional Indicator Symbol Letter A
  const ASCII_OFFSET = 0x41;   // ASCII A

  const firstChar = countryCode.charCodeAt(0) - ASCII_OFFSET + FLAG_OFFSET;
  const secondChar = countryCode.charCodeAt(1) - ASCII_OFFSET + FLAG_OFFSET;

  return String.fromCodePoint(firstChar, secondChar);
};

