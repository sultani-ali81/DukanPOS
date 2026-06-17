import { getCountries } from "libphonenumber-js";
import type { Country } from "react-phone-number-input";

export const DEFAULT_PHONE_COUNTRY: Country = "AF";

export const SUPPORTED_PHONE_COUNTRIES = getCountries() as Country[];
