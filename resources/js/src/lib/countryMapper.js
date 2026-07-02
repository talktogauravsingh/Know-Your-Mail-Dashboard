/**
 * Mapping dictionary of common country names/variations to their ISO alpha-2 codes.
 */
const COUNTRY_MAP = {
  "united states": "US",
  "united states of america": "US",
  "usa": "US",
  "us": "US",
  "united kingdom": "GB",
  "uk": "GB",
  "great britain": "GB",
  "india": "IN",
  "germany": "DE",
  "france": "FR",
  "canada": "CA",
  "italy": "IT",
  "spain": "ES",
  "japan": "JP",
  "china": "CN",
  "australia": "AU",
  "brazil": "BR",
  "mexico": "MX",
  "netherlands": "NL",
  "switzerland": "CH",
  "sweden": "SE",
  "poland": "PL",
  "turkey": "TR",
  "saudi arabia": "SA",
  "united arab emirates": "AE",
  "uae": "AE",
  "south africa": "ZA",
  "argentina": "AR",
  "south korea": "KR",
  "republic of korea": "KR",
  "russia": "RU",
  "russian federation": "RU",
  "singapore": "SG",
  "belgium": "BE",
  "austria": "AT",
  "czechia": "CZ",
  "czech republic": "CZ",
  "ukraine": "UA",
  "romania": "RO",
  "portugal": "PT",
  "greece": "GR",
  "norway": "NO",
  "denmark": "DK",
  "finland": "FI",
  "new zealand": "NZ",
  "ireland": "IE",
  "indonesia": "ID",
  "malaysia": "MY",
  "thailand": "TH",
  "vietnam": "VN",
  "philippines": "PH",
  "pakistan": "PK",
  "bangladesh": "BD",
  "egypt": "EG",
  "nigeria": "NG",
  "colombia": "CO",
  "chile": "CL",
  "peru": "PE",
  "venezuela": "VE",
  "israel": "IL",
  "hong kong": "HK",
  "taiwan": "TW",
  "hungary": "HU",
  "slovakia": "SK",
  "croatia": "HR",
  "serbia": "RS",
  "bulgaria": "BG",
  "slovenia": "SI",
  "estonia": "EE",
  "latvia": "LV",
  "lithuania": "LT",
  "morocco": "MA",
  "kenya": "KE"
};

/**
 * Returns the ISO alpha-2 code for a given country/region name.
 * If the country is not found in the dictionary, checks if it's already an ISO code,
 * otherwise returns null.
 * 
 * @param {string} name 
 * @returns {string|null}
 */
export function getCountryCode(name) {
  if (!name || typeof name !== 'string') return null;
  const sanitized = name.trim().toLowerCase();
  
  if (COUNTRY_MAP[sanitized]) {
    return COUNTRY_MAP[sanitized];
  }
  
  // If the input is already a 2-character ISO code (e.g. "US"), return it capitalized
  if (sanitized.length === 2) {
    return sanitized.toUpperCase();
  }
  
  return null;
}
