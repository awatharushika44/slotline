export interface SuggestionDto {
  kind: "same-time-elsewhere" | "next-free";
  resourceId: string;
  startIso: string;
  endIso: string;
  label: string;
}

export interface ConflictDto {
  title: string;
  holderName: string;
  window: string;
}

export type SaveResult =
  | { status: "success"; message: string }
  | { status: "invalid"; fieldErrors: Record<string, string[]>; message: string }
  | { status: "conflict"; conflicts: ConflictDto[]; suggestions: SuggestionDto[] }
  | { status: "error"; message: string };

export type SimpleResult = { ok: true } | { ok: false; message: string };