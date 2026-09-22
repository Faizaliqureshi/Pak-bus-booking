export type HolidayTour = {
  title: string;
  blurb: string;
  from: string;
  fromPkr: number;
};

export const HOLIDAY_TOURS: HolidayTour[] = [
  {
    title: "Hunza Valley",
    blurb: "Passu cones, Attabad Lake, and mountain stays.",
    from: "PKR 48,000",
    fromPkr: 48_000,
  },
  {
    title: "Skardu Escape",
    blurb: "Shangrila, Upper Kachura, and Deosai day trips.",
    from: "PKR 55,000",
    fromPkr: 55_000,
  },
  {
    title: "Swat Highlights",
    blurb: "Malam Jabba, Fizagat, and family-friendly resorts.",
    from: "PKR 32,000",
    fromPkr: 32_000,
  },
];
