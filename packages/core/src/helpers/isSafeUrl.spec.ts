import { describe, expect, it } from "vite-plus/test";
import { isSafeUrl } from "./isSafeUrl.ts";

describe("isSafeUrl", () => {
  it("allows http URLs", () => {
    expect(isSafeUrl("http://example.com")).toBe(true);
  });

  it("allows https URLs", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
  });

  it("allows mailto URLs", () => {
    expect(isSafeUrl("mailto:user@example.com")).toBe(true);
  });

  it("allows relative paths", () => {
    expect(isSafeUrl("/images/photo.png")).toBe(true);
  });

  it("allows relative paths without leading slash", () => {
    expect(isSafeUrl("images/photo.png")).toBe(true);
  });

  it("allows query parameters", () => {
    expect(isSafeUrl("https://example.com?foo=bar")).toBe(true);
  });

  it("allows hash fragments", () => {
    expect(isSafeUrl("https://example.com#section")).toBe(true);
  });

  it("rejects javascript URLs", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects data URLs", () => {
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("rejects vbscript URLs", () => {
    expect(isSafeUrl("vbscript:MsgBox(1)")).toBe(false);
  });

  it("rejects file URLs", () => {
    expect(isSafeUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects ftp URLs", () => {
    expect(isSafeUrl("ftp://example.com")).toBe(false);
  });

  it("rejects custom protocol URLs", () => {
    expect(isSafeUrl("myapp://deep/link")).toBe(false);
  });

  it("rejects uppercase JAVASCRIPT URLs", () => {
    expect(isSafeUrl("JAVASCRIPT:alert(1)")).toBe(false);
  });

  it("rejects mixed case JsCrIpT URLs", () => {
    expect(isSafeUrl("JsCrIpT:alert(1)")).toBe(false);
  });

  it("allows URLs with credentials", () => {
    expect(isSafeUrl("https://user:pass@example.com")).toBe(true);
  });

  it("allows URLs with port", () => {
    expect(isSafeUrl("https://example.com:8080")).toBe(true);
  });

  it("allows empty string", () => {
    expect(isSafeUrl("")).toBe(true);
  });
});
