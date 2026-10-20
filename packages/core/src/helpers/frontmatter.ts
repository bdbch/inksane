import { parse } from "yaml";

/** A JSON-compatible value read from YAML frontmatter. */
export type FrontmatterValue =
  | string
  | number
  | boolean
  | null
  | FrontmatterValue[]
  | { [key: string]: FrontmatterValue };

/** Parsed YAML frontmatter, keyed by its top-level property names. */
export type FrontmatterData = Record<string, FrontmatterValue>;

/** Positions of a leading frontmatter block inside a Markdown source. */
export type FrontmatterRange = {
  /** Start of the opening `---` line. */
  from: number;
  /** End of the closing fence line, without its line break. */
  to: number;
  /** End of the opening `---` line. */
  openingTo: number;
  /** Start of the YAML content, after the opening line break. */
  contentFrom: number;
  /** End of the YAML content, before the line break in front of the closing fence. */
  contentTo: number;
  /** Start of the closing fence line. */
  closingFrom: number;
};

/** Result of reading a document's frontmatter. */
export type FrontmatterResult = {
  /** The parsed values, `{}` for an empty block, or null when there is no valid block. */
  data: FrontmatterData | null;
  /** A YAML error message, or null when the block parsed. */
  error: string | null;
};

const OPENING_FENCE = /^---[ \t]*$/;
const CLOSING_FENCE = /^(?:---|\.\.\.)[ \t]*$/;

/** Whether a line can start a frontmatter block. */
export function isFrontmatterOpening(line: string): boolean {
  return OPENING_FENCE.test(line);
}

/**
 * Finds a YAML frontmatter block at the very start of a Markdown source.
 * A block only counts when both fences are present, so an unfinished block
 * keeps its normal Markdown meaning.
 *
 * @param source - The Markdown document.
 * @returns The block positions, or null when the source has no frontmatter.
 */
export function findFrontmatter(source: string): FrontmatterRange | null {
  const openingTo = source.indexOf("\n");
  if (openingTo < 0) return null;
  if (!isFrontmatterOpening(source.slice(0, openingTo))) return null;

  const contentFrom = openingTo + 1;
  let lineFrom = contentFrom;

  while (lineFrom <= source.length) {
    const lineBreak = source.indexOf("\n", lineFrom);
    const lineTo = lineBreak < 0 ? source.length : lineBreak;

    if (CLOSING_FENCE.test(source.slice(lineFrom, lineTo))) {
      return {
        from: 0,
        to: lineTo,
        openingTo,
        contentFrom,
        contentTo: lineFrom > contentFrom ? lineFrom - 1 : contentFrom,
        closingFrom: lineFrom,
      };
    }

    if (lineBreak < 0) break;
    lineFrom = lineBreak + 1;
  }

  return null;
}

/**
 * Converts YAML-specific values to plain JSON values. Dates become ISO
 * strings, maps become objects, and sets become arrays. Recursive aliases
 * are rejected because they cannot be serialized.
 */
function toPlainValue(value: unknown, ancestors: WeakSet<object>): FrontmatterValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "object") return null;
  if (ancestors.has(value)) throw new Error("Frontmatter cannot reference itself.");

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => toPlainValue(item, ancestors));
    }

    // Compare tags instead of prototypes so values from another realm still convert.
    const tag = Object.prototype.toString.call(value);

    if (tag === "[object Date]") return (value as Date).toISOString();

    if (tag === "[object Map]") {
      return Object.fromEntries(
        [...(value as Map<unknown, unknown>)].map(([key, item]) => [
          String(key),
          toPlainValue(item, ancestors),
        ]),
      );
    }

    if (tag === "[object Set]") {
      return [...(value as Set<unknown>)].map((item) => toPlainValue(item, ancestors));
    }

    if (tag === "[object Uint8Array]") {
      return [...(value as Uint8Array)];
    }

    if (tag === "[object Object]") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
          key,
          toPlainValue(item, ancestors),
        ]),
      );
    }

    return tag;
  } finally {
    ancestors.delete(value);
  }
}

/**
 * Reads the YAML values from a document's leading frontmatter block.
 *
 * @param source - The Markdown document.
 * @returns The parsed values and an error message when parsing failed.
 */
export function parseFrontmatter(source: string): FrontmatterResult {
  const range = findFrontmatter(source);
  if (!range) return { data: null, error: null };

  const content = source.slice(range.contentFrom, range.contentTo);
  if (!content.trim()) return { data: {}, error: null };

  try {
    const parsed = toPlainValue(parse(content, { logLevel: "error" }), new WeakSet());

    if (parsed === null || parsed === undefined) {
      return { data: {}, error: null };
    }

    if (typeof parsed !== "object" || Array.isArray(parsed)) {
      return { data: null, error: "Frontmatter must be a set of key and value pairs." };
    }

    return { data: parsed as FrontmatterData, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "The YAML could not be parsed.",
    };
  }
}
