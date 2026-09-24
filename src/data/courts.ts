// Source: PDX_Courts (spreadsheet / "Tennis Courts - PDX Courts.csv"), one row per park. An exact
// duplicate Fernhill Park row in the source is listed once. The CSV also has Quality, drive time and
// Google Maps name columns, which the app doesn't use yet.
export interface Park {
  name: string
  courts: number
}

export const PARKS: Park[] = [
  { name: "Alberta Park", courts: 1 },
  { name: "Alex Rovello Memorial", courts: 2 },
  { name: "Fernhill Park", courts: 2 },
  { name: "Arbor Lodge", courts: 2 },
  { name: "Argay Park", courts: 4 },
  { name: "Brentwood Park", courts: 2 },
  { name: "Clinton Park", courts: 4 },
  { name: "Col Summers Park", courts: 2 },
  { name: "Columbia Park", courts: 2 },
  { name: "David Douglas", courts: 6 },
  { name: "Essex Park", courts: 2 },
  { name: "Grant Park", courts: 6 },
  { name: "Portland Heights", courts: 2 },
  { name: "Hamilton City Park", courts: 2 },
  { name: "Irving Park", courts: 4 },
  { name: "Kenilworth Park", courts: 2 },
  { name: "Laurelhurst Park", courts: 2 },
  { name: "Lents Park", courts: 1 },
  { name: "Mt Tabor West", courts: 3 },
  { name: "Mt Tabor East", courts: 2 },
  { name: "Northgate Park", courts: 2 },
  { name: "Parkrose High School", courts: 8 },
  { name: "Rose City Park", courts: 2 },
  { name: "Roosevelt High School", courts: 4 },
  { name: "Sellwood Park", courts: 4 },
  { name: "Reed College", courts: 4 },
  { name: "West Moreland", courts: 2 },
  { name: "Willamette Park", courts: 4 },
  { name: "Happy Valley Park", courts: 2 },
  { name: "Washington Park", courts: 6 },
  { name: "Woodstock Park", courts: 2 },
  { name: "Gabriel Park", courts: 6 },
]
