export type CoachRow = {
  seats: (string | null)[];
  /** Last bench fills the aisle (e.g. 49 48 47 46 45). */
  fullWidth: boolean;
};

/** Executive 2×2: 4 3 | 2 1, then 8 7 | 6 5. Remainder 1 becomes a 5-seat rear row. */
export function buildExecutive22Rows(totalSeats: number): CoachRow[] {
  if (totalSeats < 1) return [];
  const lastFive = totalSeats % 4 === 1 && totalSeats >= 5;
  const regular = lastFive ? totalSeats - 5 : totalSeats - (totalSeats % 4);
  const rows: CoachRow[] = [];

  for (let i = 0; i < regular; i += 4) {
    rows.push({
      seats: [String(i + 4), String(i + 3), String(i + 2), String(i + 1)],
      fullWidth: false,
    });
  }

  const leftover = totalSeats - regular;
  if (leftover === 5) {
    const s = regular;
    rows.push({
      seats: [
        String(s + 5),
        String(s + 4),
        String(s + 3),
        String(s + 2),
        String(s + 1),
      ],
      fullWidth: true,
    });
  } else if (leftover === 3) {
    rows.push({
      seats: [String(regular + 3), null, String(regular + 2), String(regular + 1)],
      fullWidth: false,
    });
  } else if (leftover === 2) {
    rows.push({
      seats: [null, null, String(regular + 2), String(regular + 1)],
      fullWidth: false,
    });
  } else if (leftover === 1) {
    rows.push({
      seats: [null, null, null, String(regular + 1)],
      fullWidth: false,
    });
  }

  return rows;
}

export function buildTwoByOneRows(totalSeats: number): CoachRow[] {
  const rows: CoachRow[] = [];
  for (let i = 0; i < totalSeats; i += 2) {
    const left = String(i + 1);
    const right = i + 2 <= totalSeats ? String(i + 2) : null;
    rows.push({ seats: [left, right], fullWidth: false });
  }
  return rows;
}

export type SleeperBerth = {
  seatNumber: string;
  label: string;
};

export type SleeperDeckRow = {
  berths: SleeperBerth[];
  lastTriple: boolean;
};

export type SleeperDeck = {
  name: "Lower deck" | "Upper deck";
  rows: SleeperDeckRow[];
};

function buildSleeperDeck(
  count: number,
  suffix: "L" | "U",
  startId: number,
): { rows: SleeperDeckRow[]; nextId: number } {
  const lastTriple = count % 2 === 1 && count >= 3;
  const pairSeats = lastTriple ? count - 3 : count - (count % 2);
  const rows: SleeperDeckRow[] = [];
  let label = 1;
  let id = startId;

  for (let i = 0; i < pairSeats; i += 2) {
    rows.push({
      lastTriple: false,
      berths: [
        { seatNumber: String(id), label: `${label}${suffix}` },
        { seatNumber: String(id + 1), label: `${label + 1}${suffix}` },
      ],
    });
    id += 2;
    label += 3;
  }

  if (lastTriple) {
    rows.push({
      lastTriple: true,
      berths: [
        { seatNumber: String(id), label: `${label}${suffix}` },
        { seatNumber: String(id + 1), label: `${label + 1}${suffix}` },
        { seatNumber: String(id + 2), label: `${label + 2}${suffix}` },
      ],
    });
    id += 3;
  } else if (count - pairSeats === 1) {
    rows.push({
      lastTriple: false,
      berths: [{ seatNumber: String(id), label: `${label}${suffix}` }],
    });
    id += 1;
  }

  return { rows, nextId: id };
}

/** Dual-deck sleeper: 1L 2L / 4L 5L … and matching Upper deck. Last odd row is 31 32 33. */
export function buildSleeperDecks(totalSeats: number): SleeperDeck[] {
  if (totalSeats < 1) return [];
  const lowerCount = Math.ceil(totalSeats / 2);
  const upperCount = totalSeats - lowerCount;
  const lower = buildSleeperDeck(lowerCount, "L", 1);
  const decks: SleeperDeck[] = [
    { name: "Lower deck", rows: lower.rows },
  ];
  if (upperCount > 0) {
    const upper = buildSleeperDeck(upperCount, "U", lower.nextId);
    decks.push({ name: "Upper deck", rows: upper.rows });
  }
  return decks;
}

export function sleeperLabelFor(
  seatNumber: string,
  totalSeats: number,
): string {
  for (const deck of buildSleeperDecks(totalSeats)) {
    for (const row of deck.rows) {
      const hit = row.berths.find((b) => b.seatNumber === seatNumber);
      if (hit) return hit.label;
    }
  }
  return seatNumber;
}

export function buildCoachRows(
  totalSeats: number,
  layoutType: string,
): CoachRow[] {
  if (isSleeperLayout(layoutType)) return [];
  if (isTwoByOneLayout(layoutType)) return buildTwoByOneRows(totalSeats);
  return buildExecutive22Rows(totalSeats);
}

export function isSleeperLayout(layoutType?: string | null): boolean {
  return Boolean(layoutType?.toUpperCase().includes("SLEEPER"));
}

export function isTwoByOneLayout(layoutType?: string | null): boolean {
  const t = layoutType?.toUpperCase() ?? "";
  return t.includes("2X1") && !t.includes("SLEEPER");
}

/** Adjacent seat across the same pair (window ↔ aisle). */
export function pairMate(
  seatNumber: string,
  rows: CoachRow[],
  sleeper: boolean,
): string | null {
  if (sleeper) return null;
  for (const row of rows) {
    if (row.fullWidth) {
      const pairs: [number, number][] = [
        [0, 1],
        [3, 4],
      ];
      for (const [a, b] of pairs) {
        if (row.seats[a] === seatNumber) return row.seats[b];
        if (row.seats[b] === seatNumber) return row.seats[a];
      }
      continue;
    }
    const pairs: [number, number][] = [
      [0, 1],
      [2, 3],
    ];
    for (const [a, b] of pairs) {
      if (row.seats[a] === seatNumber) return row.seats[b];
      if (row.seats[b] === seatNumber) return row.seats[a];
    }
  }
  return null;
}
