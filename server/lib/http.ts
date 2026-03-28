import type { VercelResponse } from "@vercel/node";

export const sendMethodNotAllowed = (
  res: VercelResponse,
  allowedMethods: string[],
) => {
  res.setHeader("Allow", allowedMethods.join(", "));
  return res.status(405).json({ error: "Method not allowed" });
};

export const sendOptions = (res: VercelResponse, allowedMethods: string[]) => {
  res.setHeader("Allow", allowedMethods.join(", "));
  return res.status(204).end();
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const parseStringArray = (value: unknown): string[] | null => {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = value.map((entry) =>
    typeof entry === "string" ? entry.trim() : entry,
  );

  if (
    normalized.some((entry) => typeof entry !== "string" || entry.length === 0)
  ) {
    return null;
  }

  return [...new Set(normalized as string[])];
};

export const parseNullableString = (
  value: unknown,
): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const parseRequiredString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const parseOptionalNumber = (value: unknown): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
};