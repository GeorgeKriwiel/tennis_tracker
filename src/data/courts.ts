// Source: PDX_Courts (spreadsheet / "Tennis Courts - PDX Courts.csv"), one row per park. An exact
// duplicate Fernhill Park row in the source is listed once. The CSV also has Quality, drive time and
// Google Maps name columns, which the app doesn't use yet. lat/lng were derived from OpenStreetMap:
// the mapped tennis courts nearest each park (parks with no mapped courts nearby use the park pin).
export interface Park {
  name: string
  courts: number
  // Location of the tennis courts themselves (not the park's center), used for drive times.
  lat: number
  lng: number
}

export const PARKS: Park[] = [
  { name: "Alberta Park", courts: 1, lat: 45.56361, lng: -122.64577 },
  { name: "Alex Rovello Memorial", courts: 2, lat: 45.4727, lng: -122.62307 },
  { name: "Fernhill Park", courts: 2, lat: 45.56756, lng: -122.62512 },
  { name: "Arbor Lodge", courts: 2, lat: 45.57321, lng: -122.69369 },
  { name: "Argay Park", courts: 4, lat: 45.55212, lng: -122.51913 },
  { name: "Brentwood Park", courts: 2, lat: 45.47247, lng: -122.60174 },
  { name: "Clinton Park", courts: 4, lat: 45.5018, lng: -122.60521 },
  { name: "Col Summers Park", courts: 2, lat: 45.51616, lng: -122.64678 },
  { name: "Columbia Park", courts: 2, lat: 45.5803, lng: -122.70957 },
  { name: "David Douglas", courts: 6, lat: 45.51455, lng: -122.52668 },
  { name: "Essex Park", courts: 2, lat: 45.49415, lng: -122.58435 },
  { name: "Grant Park", courts: 6, lat: 45.53991, lng: -122.62942 },
  { name: "Portland Heights", courts: 2, lat: 45.50391, lng: -122.70802 },
  { name: "Hamilton City Park", courts: 2, lat: 45.4922, lng: -122.72064 },
  { name: "Irving Park", courts: 4, lat: 45.54617, lng: -122.65795 },
  { name: "Kenilworth Park", courts: 2, lat: 45.49089, lng: -122.63231 },
  { name: "Laurelhurst Park", courts: 2, lat: 45.51996, lng: -122.62542 },
  { name: "Lents Park", courts: 1, lat: 45.48557, lng: -122.56999 },
  { name: "Mt Tabor West", courts: 3, lat: 45.51294, lng: -122.59927 },
  { name: "Mt Tabor East", courts: 2, lat: 45.51494, lng: -122.59039 },
  { name: "Northgate Park", courts: 2, lat: 45.58964, lng: -122.72459 },
  { name: "Parkrose High School", courts: 8, lat: 45.55291, lng: -122.54354 },
  { name: "Rose City Park", courts: 2, lat: 45.53866, lng: -122.59848 },
  { name: "Roosevelt High School", courts: 4, lat: 45.59062, lng: -122.73715 },
  { name: "Sellwood Park", courts: 4, lat: 45.4665, lng: -122.66062 },
  { name: "Reed College", courts: 4, lat: 45.48705, lng: -122.63585 },
  { name: "West Moreland", courts: 2, lat: 45.47383, lng: -122.64081 },
  { name: "Willamette Park", courts: 4, lat: 45.47417, lng: -122.67037 },
  { name: "Happy Valley Park", courts: 2, lat: 45.45364, lng: -122.52144 },
  { name: "Washington Park", courts: 6, lat: 45.51944, lng: -122.7065 },
  { name: "Woodstock Park", courts: 2, lat: 45.48301, lng: -122.61109 },
  { name: "Gabriel Park", courts: 6, lat: 45.47371, lng: -122.72129 },
]
