export interface Country {
  code: string;
  name: string;
  gradeSystemNote: string;
}

export const COUNTRIES: Country[] = [
  {
    code: 'US',
    name: 'United States',
    gradeSystemNote: 'US grades K-12 system'
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    gradeSystemNote: 'UK system: Reception, Years 1-13. Year 1 ≈ US Grade K, Year 7 ≈ US Grade 6'
  },
  {
    code: 'CA',
    name: 'Canada',
    gradeSystemNote: 'Canadian grades similar to US K-12 system'
  },
  {
    code: 'AU',
    name: 'Australia',
    gradeSystemNote: 'Australian system: Prep/Foundation, Years 1-12'
  },
  {
    code: 'IN',
    name: 'India',
    gradeSystemNote: 'Indian system: Classes/Standards 1-12, LKG/UKG for kindergarten'
  },
  {
    code: 'SG',
    name: 'Singapore',
    gradeSystemNote: 'Singapore: Primary 1-6, Secondary 1-4'
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    gradeSystemNote: 'NZ: Years 1-13, Year 1 starts at age 5'
  },
  {
    code: 'IE',
    name: 'Ireland',
    gradeSystemNote: 'Irish system: Junior/Senior Infants, 1st-6th class (primary), 1st-6th year (secondary)'
  },
  {
    code: 'PH',
    name: 'Philippines',
    gradeSystemNote: 'Philippine K-12 system similar to US'
  },
  {
    code: 'ZA',
    name: 'South Africa',
    gradeSystemNote: 'South African Grades R-12 (R = Reception)'
  },
  {
    code: 'OTHER',
    name: 'Other',
    gradeSystemNote: 'Using US grade equivalents as reference'
  },
];

export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}

export function getGradeSystemNote(countryCode: string): string {
  const country = getCountryByCode(countryCode);
  return country?.gradeSystemNote || 'Using US grade equivalents as reference';
}
