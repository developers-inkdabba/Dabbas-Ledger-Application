export type CountryDialCode = {
  id: string;
  name: string;
  iso: string;
  dialCode: string;
  example: string;
  minLength: number;
  maxLength: number;
};

export const countryDialCodes: CountryDialCode[] = [
  { id: "in", name: "India", iso: "IN", dialCode: "+91", example: "98765 43210", minLength: 10, maxLength: 10 },
  { id: "us", name: "United States", iso: "US", dialCode: "+1", example: "415 555 0123", minLength: 10, maxLength: 10 },
  { id: "ca", name: "Canada", iso: "CA", dialCode: "+1", example: "416 555 0123", minLength: 10, maxLength: 10 },
  { id: "gb", name: "United Kingdom", iso: "GB", dialCode: "+44", example: "7400 123456", minLength: 10, maxLength: 10 },
  { id: "ae", name: "United Arab Emirates", iso: "AE", dialCode: "+971", example: "50 123 4567", minLength: 9, maxLength: 9 },
  { id: "sg", name: "Singapore", iso: "SG", dialCode: "+65", example: "8123 4567", minLength: 8, maxLength: 8 },
  { id: "au", name: "Australia", iso: "AU", dialCode: "+61", example: "412 345 678", minLength: 9, maxLength: 9 },
  { id: "de", name: "Germany", iso: "DE", dialCode: "+49", example: "1512 3456789", minLength: 7, maxLength: 12 },
  { id: "fr", name: "France", iso: "FR", dialCode: "+33", example: "6 12 34 56 78", minLength: 9, maxLength: 9 },
  { id: "nl", name: "Netherlands", iso: "NL", dialCode: "+31", example: "6 12345678", minLength: 9, maxLength: 9 },
  { id: "sa", name: "Saudi Arabia", iso: "SA", dialCode: "+966", example: "50 123 4567", minLength: 9, maxLength: 9 },
  { id: "qa", name: "Qatar", iso: "QA", dialCode: "+974", example: "3312 3456", minLength: 8, maxLength: 8 },
  { id: "om", name: "Oman", iso: "OM", dialCode: "+968", example: "9123 4567", minLength: 8, maxLength: 8 },
  { id: "kw", name: "Kuwait", iso: "KW", dialCode: "+965", example: "5123 4567", minLength: 8, maxLength: 8 },
  { id: "bh", name: "Bahrain", iso: "BH", dialCode: "+973", example: "3600 1234", minLength: 8, maxLength: 8 },
  { id: "lk", name: "Sri Lanka", iso: "LK", dialCode: "+94", example: "71 234 5678", minLength: 9, maxLength: 9 },
  { id: "np", name: "Nepal", iso: "NP", dialCode: "+977", example: "984 1234567", minLength: 10, maxLength: 10 },
  { id: "bd", name: "Bangladesh", iso: "BD", dialCode: "+880", example: "1712 345678", minLength: 10, maxLength: 10 },
  { id: "my", name: "Malaysia", iso: "MY", dialCode: "+60", example: "12 345 6789", minLength: 9, maxLength: 10 },
  { id: "id", name: "Indonesia", iso: "ID", dialCode: "+62", example: "812 3456 7890", minLength: 9, maxLength: 12 },
  { id: "th", name: "Thailand", iso: "TH", dialCode: "+66", example: "81 234 5678", minLength: 9, maxLength: 9 }
];

export const defaultCountry = countryDialCodes[0];

export const digitsOnly = (value: string) => value.replace(/\D/g, "");

export const findCountryForPhone = (value?: string) => {
  const normalized = (value || "").trim();
  if (!normalized.startsWith("+")) return defaultCountry;
  return [...countryDialCodes]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((country) => normalized.startsWith(country.dialCode)) || defaultCountry;
};

export const nationalNumberFromPhone = (value: string, country: CountryDialCode) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith(country.dialCode)) return digitsOnly(trimmed.slice(country.dialCode.length));
  const matchedCountry = findCountryForPhone(trimmed);
  if (trimmed.startsWith(matchedCountry.dialCode)) return digitsOnly(trimmed.slice(matchedCountry.dialCode.length));
  return digitsOnly(trimmed);
};

export const composeInternationalPhone = (country: CountryDialCode, nationalNumber: string) => {
  const digits = digitsOnly(nationalNumber).slice(0, country.maxLength);
  return digits ? `${country.dialCode}${digits}` : "";
};

export const isValidInternationalPhone = (value?: string) => {
  const trimmed = (value || "").trim();
  if (!trimmed) return true;
  const country = findCountryForPhone(trimmed);
  const nationalNumber = nationalNumberFromPhone(trimmed, country);
  return trimmed.startsWith(country.dialCode) && nationalNumber.length >= country.minLength && nationalNumber.length <= country.maxLength;
};
