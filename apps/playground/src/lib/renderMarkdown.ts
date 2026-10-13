/**
 * A tiny, dependency-free Markdown -> HTML renderer for the chat demo.
 *
 * It only exists so the demo can show the "what you typed" (Markdown) next to
 * "what it renders to" (HTML). It covers the common subset the editor writes:
 * headings, emphasis, inline code, fenced code, links, images, blockquotes,
 * lists, tables, horizontal rules and paragraphs.
 *
 * Everything that is not emitted by this file is escaped, so interpolating the
 * result with `innerHTML` is safe.
 */
import { escapeHtml } from "@inksane/core";

/** Sentinel wrapped around stashed inline-code spans so later passes skip them. */
const MARK = "\uE000";

function renderInline(source: string): string {
  const codeSpans: string[] = [];
  let text = source.replace(/`([^`]+)`/g, (_match, code: string) => {
    codeSpans.push(`<code>${escapeHtml(code)}</code>`);
    return `${MARK}${codeSpans.length - 1}${MARK}`;
  });

  text = escapeHtml(text);

  text = text.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_match, alt: string, url: string) => `<img src="${url}" alt="${alt}">`,
  );
  text = text.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_match, label: string, url: string) =>
      `<a href="${url}" target="_blank" rel="noreferrer noopener">${label}</a>`,
  );

  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  text = text.replace(/(^|[^\w*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  text = text.replace(/(^|[^\w_])_([^_\n]+)_/g, "$1<em>$2</em>");
  text = text.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  for (let index = 0; index < codeSpans.length; index++) {
    text = text.split(`${MARK}${index}${MARK}`).join(codeSpans[index]);
  }

  return text;
}

const isBlank = (line: string): boolean => line.trim() === "";

const headingMatch = (line: string): RegExpExecArray | null =>
  /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);

const listMatch = (line: string): RegExpExecArray | null =>
  /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);

const isHorizontalRule = (line: string): boolean => /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line);

const isTableSeparator = (line: string): boolean =>
  line.includes("-") && /^\s*\|?[\s:|-]+\|?[\s:|-]*$/.test(line);

const startsBlock = (line: string): boolean =>
  isBlank(line) ||
  /^\s*(`{3,}|~{3,})/.test(line) ||
  headingMatch(line) !== null ||
  isHorizontalRule(line) ||
  /^\s*>/.test(line) ||
  listMatch(line) !== null;

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderBlocks(lines: string[]): string {
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (isBlank(line)) {
      index++;
      continue;
    }

    const fence = /^\s*(`{3,}|~{3,})\s*([\w+-]*)\s*$/.exec(line);
    if (fence) {
      const marker = fence[1][0];
      const language = fence[2];
      const body: string[] = [];
      index++;
      while (index < lines.length && !new RegExp(`^\\s*${marker}{3,}\\s*$`).test(lines[index])) {
        body.push(lines[index]);
        index++;
      }
      index++;
      const className = language ? ` class="language-${escapeHtml(language)}"` : "";
      html.push(`<pre><code${className}>${escapeHtml(body.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = headingMatch(line);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      index++;
      continue;
    }

    if (isHorizontalRule(line)) {
      html.push("<hr>");
      index++;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const body: string[] = [];
      while (index < lines.length) {
        if (isBlank(lines[index])) {
          if (index + 1 >= lines.length || !/^\s*>/.test(lines[index + 1])) break;
          body.push("");
          index++;
          continue;
        }
        if (!/^\s*>/.test(lines[index])) break;
        body.push(lines[index].replace(/^\s*>\s?/, ""));
        index++;
      }
      html.push(`<blockquote>${renderBlocks(body)}</blockquote>`);
      continue;
    }

    if (line.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const header = splitRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].includes("|") && !startsBlock(lines[index])) {
        rows.push(splitRow(lines[index]));
        index++;
      }
      const head = header.map((cell) => `<th>${renderInline(cell)}</th>`).join("");
      const body = rows
        .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
        .join("");
      html.push(`<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
      continue;
    }

    const list = listMatch(line);
    if (list) {
      const ordered = /^\d/.test(list[2]);
      const baseIndent = list[1].length;
      const items: string[][] = [];

      while (index < lines.length) {
        const current = lines[index];
        if (isBlank(current)) {
          if (index + 1 < lines.length && listMatch(lines[index + 1])) {
            index++;
            continue;
          }
          break;
        }
        const match = listMatch(current);
        if (!match || match[1].length > baseIndent || /^\d/.test(match[2]) !== ordered) break;

        const content = [match[3]];
        index++;
        while (index < lines.length && !isBlank(lines[index])) {
          const next = listMatch(lines[index]);
          if (next && next[1].length <= baseIndent) break;
          content.push(lines[index].replace(/^\s+/, ""));
          index++;
        }
        items.push(content);
      }

      const tag = ordered ? "ol" : "ul";
      const rendered = items
        .map((item) => {
          const hasNestedBlock = item.slice(1).some((nested) => startsBlock(nested));
          const content = hasNestedBlock
            ? renderBlocks(item)
            : item.map((part) => renderInline(part)).join("<br>");
          return `<li>${content}</li>`;
        })
        .join("");
      html.push(`<${tag}>${rendered}</${tag}>`);
      continue;
    }

    const paragraph = [line];
    index++;
    while (index < lines.length && !startsBlock(lines[index])) {
      paragraph.push(lines[index]);
      index++;
    }
    html.push(`<p>${paragraph.map((part) => renderInline(part)).join("<br>")}</p>`);
  }

  return html.join("\n");
}

/** Renders a Markdown string to an HTML string. */
export function renderMarkdown(source: string): string {
  return renderBlocks(source.replace(/\r\n?/g, "\n").split("\n"));
}
