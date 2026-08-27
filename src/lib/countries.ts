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
