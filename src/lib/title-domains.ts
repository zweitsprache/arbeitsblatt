export const TITLE_DOMAINS = [
  "Arbeit",
  "Arbeitssuche",
  "Behörden",
  "Deutschkurs",
  "Einkaufen",
  "Familie und Partnerschaft",
  "Freizeit und Hobbys",
  "Geld",
  "Gesundheit",
  "Kinder und Schule",
  "Mobilität",
  "Religion und Tradition",
  "Soziales Netz",
  "Umwelt und Klima",
  "Weiterbildung",
  "Wohnen",
] as const;

export type TitleDomain = (typeof TITLE_DOMAINS)[number];
