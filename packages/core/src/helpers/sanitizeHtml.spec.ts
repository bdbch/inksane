import { describe, expect, it } from "vite-plus/test";
import { sanitizeHtml } from "./sanitizeHtml.ts";

describe("sanitizeHtml", () => {
  it("keeps allowed elements and attributes", () => {
    expect(sanitizeHtml('<p class="note">Hi <strong>there</strong></p>')).toBe(
      '<p class="note">Hi <strong>there</strong></p>',
    );
  });

  it("removes script elements with their content", () => {
    expect(sanitizeHtml("<div>safe<script>alert(1)</script></div>")).toBe("<div>safe</div>");
  });

  it("strips inline event handlers", () => {
    expect(sanitizeHtml('<img src="https://example.com/a.png" onerror="alert(1)">')).toBe(
      '<img src="https://example.com/a.png">',
    );
  });

  it("drops unsafe urls", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
  });

  it("unwraps unknown elements but keeps their children", () => {
    expect(sanitizeHtml("<custom>text</custom>")).toBe("text");
  });

  it("removes comments", () => {
    expect(sanitizeHtml("<div><!-- hidden -->shown</div>")).toBe("<div>shown</div>");
  });

  it("keeps checkbox inputs and drops other inputs", () => {
    expect(
      sanitizeHtml(
        '<li><input type="checkbox" checked disabled><input type="text" value="x"></li>',
      ),
    ).toBe('<li><input type="checkbox" checked="" disabled=""></li>');
  });
});
