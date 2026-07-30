import { describe, it, vi, expect } from "vite-plus/test";
import { EventEmitter } from "./EventEmitter.ts";

describe("EventEmitter", () => {
  it("creates listeners and triggers callbacks", () => {
    const mockCb = vi.fn();
    let count = 0;

    expect(mockCb).not.toHaveBeenCalled();

    const ee = new EventEmitter();
    ee.on("test", (newCount: number) => {
      count = newCount;
      mockCb();
    });

    ee.emit("test", 3);
    expect(mockCb).toHaveBeenCalledTimes(1);
    expect(count).toBe(3);

    ee.emit("test", 15);
    expect(mockCb).toHaveBeenCalledTimes(2);
    expect(count).toBe(15);
  });

  it("removes listeners correctly", () => {
    const mockCb = vi.fn();
    expect(mockCb).not.toHaveBeenCalled();

    const ee = new EventEmitter();
    ee.on("test", mockCb);

    ee.emit("test");
    expect(mockCb).toHaveBeenCalledTimes(1);

    ee.off("test", mockCb);
    ee.emit("test");
    expect(mockCb).toHaveBeenCalledTimes(1);
  });

  it("runs once just once", () => {
    const mockCb = vi.fn();
    const mockCbOnce = vi.fn();
    expect(mockCb).not.toHaveBeenCalled();
    expect(mockCbOnce).not.toHaveBeenCalled();

    const ee = new EventEmitter();
    ee.on("test", mockCb);
    ee.once("test", mockCbOnce);

    ee.emit("test");
    expect(mockCb).toHaveBeenCalledTimes(1);
    expect(mockCbOnce).toHaveBeenCalledTimes(1);

    ee.emit("test");
    expect(mockCb).toHaveBeenCalledTimes(2);
    expect(mockCbOnce).toHaveBeenCalledTimes(1);
  });
});
