import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";
import { htmlWidget } from "./htmlWidget.ts";

describe("htmlWidget", () => {
  let editor: Editor;
  let view: Editor["view"];

  beforeEach(() => {
    editor = new Editor({ element: document.createElement("div"), content: "hello" });
    view = editor.view;
  });

  afterEach(() => {
    editor.view.dom.parentElement?.remove();
    editor.destroy();
  });

  it("renders markup in an inline element by default", () => {
    const dom = htmlWidget("<b>hi</b>").toDOM(view);

    expect(dom.tagName).toBe("SPAN");
    expect(dom.className).toBe("inksane-html");
    expect(dom.innerHTML).toBe("<b>hi</b>");
  });

  it("renders markup in a block element when asked", () => {
    const dom = htmlWidget("<p>hi</p>", { block: true, className: "callout" }).toDOM(view);

    expect(dom.tagName).toBe("DIV");
    expect(dom.className).toBe("inksane-html callout");
    expect(dom.style.display).toBe("flow-root");
  });

  it("treats markup as trusted and does not escape it", () => {
    const dom = htmlWidget('<span data-x="1">ok</span>').toDOM(view);

    expect(dom.querySelector("[data-x='1']")).not.toBeNull();
  });

  it("compares widgets by content and options", () => {
    expect(htmlWidget("<b>hi</b>").eq(htmlWidget("<b>hi</b>"))).toBe(true);
    expect(htmlWidget("<b>hi</b>").eq(htmlWidget("<b>ho</b>"))).toBe(false);
    expect(htmlWidget("<b>hi</b>").eq(htmlWidget("<b>hi</b>", { block: true }))).toBe(false);
  });
});
