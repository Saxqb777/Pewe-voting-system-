/**
 * Where a voter is voting from.
 *
 * The ones people from this village are most likely to be in come first, then
 * everywhere else in alphabetical order. Kept as plain data so the list can be
 * edited without touching any logic.
 */
export const COMMON_COUNTRIES = [
  "India",
  "United Arab Emirates",
  "Saudi Arabia",
  "Oman",
  "Qatar",
  "Kuwait",
  "Bahrain",
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "Singapore",
  "Malaysia",
] as const;

export const OTHER_COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Armenia", "Austria",
  "Azerbaijan", "Bangladesh", "Belgium", "Bhutan", "Brazil", "Brunei",
  "Bulgaria", "Cambodia", "Chile", "China", "Colombia", "Croatia", "Cyprus",
  "Czechia", "Denmark", "Egypt", "Ethiopia", "Fiji", "Finland", "France",
  "Georgia", "Germany", "Ghana", "Greece", "Hong Kong", "Hungary", "Indonesia",
  "Iran", "Iraq", "Ireland", "Israel", "Italy", "Japan", "Jordan", "Kazakhstan",
  "Kenya", "Kyrgyzstan", "Laos", "Lebanon", "Libya", "Lithuania", "Luxembourg",
  "Macau", "Maldives", "Malta", "Mauritius", "Mexico", "Mongolia", "Morocco",
  "Mozambique", "Myanmar", "Nepal", "Netherlands", "New Zealand", "Nigeria",
  "Norway", "Pakistan", "Papua New Guinea", "Philippines", "Poland", "Portugal",
  "Romania", "Russia", "Rwanda", "Senegal", "Serbia", "Seychelles",
  "Sierra Leone", "Slovakia", "Slovenia", "Somalia", "South Africa",
  "South Korea", "Spain", "Sri Lanka", "Sudan", "Sweden", "Switzerland",
  "Taiwan", "Tanzania", "Thailand", "Tunisia", "Turkey", "Turkmenistan",
  "Uganda", "Ukraine", "Uzbekistan", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
] as const;

export const OTHER_LABEL = "Somewhere else";

const ALL = new Set<string>([
  ...COMMON_COUNTRIES,
  ...OTHER_COUNTRIES,
  OTHER_LABEL,
]);

/** Accepts only a name from the list, so nothing else can be stored. */
export function normaliseCountry(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return ALL.has(value) ? value : null;
}

/**
 * The two letter code each country is known by to the phone rules.
 *
 * Only ever used as a hint when somebody types a number with no country code
 * on the front. It never overrides a number that carries its own.
 */
const ISO: Record<string, string> = {
  "India": "IN", "United Arab Emirates": "AE", "Saudi Arabia": "SA",
  "Oman": "OM", "Qatar": "QA", "Kuwait": "KW", "Bahrain": "BH",
  "United Kingdom": "GB", "United States": "US", "Canada": "CA",
  "Australia": "AU", "Singapore": "SG", "Malaysia": "MY",
  "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Argentina": "AR",
  "Armenia": "AM", "Austria": "AT", "Azerbaijan": "AZ", "Bangladesh": "BD",
  "Belgium": "BE", "Bhutan": "BT", "Brazil": "BR", "Brunei": "BN",
  "Bulgaria": "BG", "Cambodia": "KH", "Chile": "CL", "China": "CN",
  "Colombia": "CO", "Croatia": "HR", "Cyprus": "CY", "Czechia": "CZ",
  "Denmark": "DK", "Egypt": "EG", "Ethiopia": "ET", "Fiji": "FJ",
  "Finland": "FI", "France": "FR", "Georgia": "GE", "Germany": "DE",
  "Ghana": "GH", "Greece": "GR", "Hong Kong": "HK", "Hungary": "HU",
  "Indonesia": "ID", "Iran": "IR", "Iraq": "IQ", "Ireland": "IE",
  "Israel": "IL", "Italy": "IT", "Japan": "JP", "Jordan": "JO",
  "Kazakhstan": "KZ", "Kenya": "KE", "Kyrgyzstan": "KG", "Laos": "LA",
  "Lebanon": "LB", "Libya": "LY", "Lithuania": "LT", "Luxembourg": "LU",
  "Macau": "MO", "Maldives": "MV", "Malta": "MT", "Mauritius": "MU",
  "Mexico": "MX", "Mongolia": "MN", "Morocco": "MA", "Mozambique": "MZ",
  "Myanmar": "MM", "Nepal": "NP", "Netherlands": "NL", "New Zealand": "NZ",
  "Nigeria": "NG", "Norway": "NO", "Pakistan": "PK", "Papua New Guinea": "PG",
  "Philippines": "PH", "Poland": "PL", "Portugal": "PT", "Romania": "RO",
  "Russia": "RU", "Rwanda": "RW", "Senegal": "SN", "Serbia": "RS",
  "Seychelles": "SC", "Sierra Leone": "SL", "Slovakia": "SK", "Slovenia": "SI",
  "Somalia": "SO", "South Africa": "ZA", "South Korea": "KR", "Spain": "ES",
  "Sri Lanka": "LK", "Sudan": "SD", "Sweden": "SE", "Switzerland": "CH",
  "Taiwan": "TW", "Tanzania": "TZ", "Thailand": "TH", "Tunisia": "TN",
  "Turkey": "TR", "Turkmenistan": "TM", "Uganda": "UG", "Ukraine": "UA",
  "Uzbekistan": "UZ", "Vietnam": "VN", "Yemen": "YE", "Zambia": "ZM",
  "Zimbabwe": "ZW",
};

/** Null for "Somewhere else", which names no particular dialling rules. */
export function isoForCountry(name: string | null): string | null {
  if (!name) return null;
  return ISO[name] ?? null;
}
