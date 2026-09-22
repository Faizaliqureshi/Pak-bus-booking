export const SERVICE_KINDS = ["VISA", "UMRAH", "HOLIDAY"] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];

export function isServiceKind(value: string): value is ServiceKind {
  return SERVICE_KINDS.includes(value as ServiceKind);
}

export function servicePrefix(kind: ServiceKind): string {
  if (kind === "VISA") return "VS";
  if (kind === "UMRAH") return "UM";
  return "HL";
}
