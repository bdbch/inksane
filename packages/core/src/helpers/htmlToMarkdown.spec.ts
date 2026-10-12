import { describe, expect, it } from "vite-plus/test";
import type { HtmlConverter } from "../types/index.ts";
import { htmlToMarkdown } from "./htmlToMarkdown.ts";

const bold: HtmlConverter = {
  match: (element) => ["strong", "b"].includes(element.tagName.toLowerCase()),
  toMarkdown: (element, { renderChildren }) => `**${renderChildren(element).trim()}**`,
};

const heading: HtmlConverter = {
  block: true,
  match: (element) => /^h[1-6]$/.test(element.tagName.toLowerCase()),
  toMarkdown: (element, { renderChildren }) =>
    `${"#".repeat(Number(element.tagName[1]))} ${renderChildren(element).trim()}`,
};

describe("htmlToMarkdown", () => {
  it("joins blocks with blank lines", () => {
    expect(htmlToMarkdown("<div><p>a</p><p>b</p></div>")).toBe("a\n\nb");
  });

  it("collapses whitespace", () => {
    expect(htmlToMarkdown("<p>a\n   b</p>")).toBe("a b");
  });

  it("converts hard line breaks", () => {
    expect(htmlToMarkdown("<p>a<br>b</p>")).toBe("a\\\nb");
  });

  it("escapes a leading block marker", () => {
    expect(htmlToMarkdown("<p># not a heading</p>")).toBe("\\# not a heading");
  });

  it("unwraps unknown elements", () => {
    expect(htmlToMarkdown("<custom>text</custom>")).toBe("text");
  });

  it("removes script elements", () => {
    expect(htmlToMarkdown("<div>safe<script>alert(1)</script></div>")).toBe("safe");
  });

  it("returns an empty string when nothing converts", () => {
    expect(htmlToMarkdown('<meta charset="utf-8">')).toBe("");
  });

  it("applies an inline converter", () => {
    expect(htmlToMarkdown("<p>a <strong>b</strong></p>", [bold])).toBe("a **b**");
  });

  it("applies a block converter", () => {
    expect(htmlToMarkdown("<h2>Title</h2><p>body</p>", [heading])).toBe("## Title\n\nbody");
  });

  it("keeps text when no converter claims the element", () => {
    expect(htmlToMarkdown("<p>a <strong>b</strong></p>")).toBe("a b");
  });
});
