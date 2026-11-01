import { describe, expect, it } from 'vitest';
import { clampZoom, fitZoom, zoomScroll, scaledSize, initialZoom } from './viewport';
describe('diagram viewport', () => {
  it('bounds zoom without losing long diagram extents', () => {
    expect(clampZoom(0)).toBe(0.05);
    expect(clampZoom(20)).toBe(4);
    expect(scaledSize({width: 800, height: 12000}, 0.5)).toEqual({width:400,height:6000});
  });
  it('fits both axes, and starts long processes at a readable scale', () => {
    expect(fitZoom({width:1000,height:800}, {width:2000,height:1000})).toBe(0.484);
    expect(fitZoom({width:600,height:400}, {width:800,height:12000})).toBe(0.05);
    expect(initialZoom({width:600,height:400}, {width:800,height:12000})).toBe(0.75);
  });
  it('keeps the diagram point underneath the pointer when zooming', () => {
    expect(zoomScroll(300, 100, 1, 2)).toBe(700);
    expect(zoomScroll(700, 100, 2, 1)).toBe(300);
    expect(zoomScroll(0, 100, 1, 0.5)).toBe(0);
  });
});

import { stepZoom, wheelZoom, doubleClickZoom, ZOOM_STOPS } from './viewport';
describe('fast zoom controls', () => {
  it('reaches 100% from an arbitrary 28% fit in two clicks', () => {
    expect(stepZoom(0.28, 1)).toBe(0.5);
    expect(stepZoom(stepZoom(0.28, 1), 1)).toBe(1);
    expect(stepZoom(0.28, -1)).toBe(0.25);
  });
  it('moves strictly past exact presets and clamps both ends', () => {
    for(const stop of ZOOM_STOPS) {
      if(stop < 4) expect(stepZoom(stop, 1)).toBeGreaterThan(stop);
      if(stop > 0.05) expect(stepZoom(stop, -1)).toBeLessThan(stop);
    }
    expect(stepZoom(1, 1)).toBe(2);
    expect(stepZoom(1, -1)).toBe(0.5);
    expect(stepZoom(4, 1)).toBe(4);
    expect(stepZoom(0.05, -1)).toBe(0.05);
  });
  it('preserves pointer anchoring through a rapid pair of wheel updates', () => {
    const first = wheelZoom(0.5, -50, 0, 500);
    const second = wheelZoom(first, -50, 0, 500);
    const firstScroll = zoomScroll(300, 120, 0.5, first);
    const secondScroll = zoomScroll(firstScroll, 120, first, second);
    expect((secondScroll + 120) / second).toBe((300 + 120) / 0.5);
    expect(scaledSize({width:1000,height:12000},second)).toEqual({width:2000,height:24000});
  });
  it('normalizes wheel pixel, line and page deltas and doubles per 50px notch', () => {
    expect(wheelZoom(0.28, -50, 0, 500)).toBeCloseTo(0.56);
    expect(wheelZoom(1, -3.125, 1, 500)).toBeCloseTo(2);
    expect(wheelZoom(1, -0.1, 2, 500)).toBeCloseTo(2);
    expect(wheelZoom(1, 50, 0, 500)).toBeCloseTo(0.5);
    expect(wheelZoom(4, -1000, 0, 500)).toBe(4);
    expect(wheelZoom(0.05, 1000, 0, 500)).toBe(0.05);
    expect(wheelZoom(1, 0, 0, 500)).toBe(1);
    expect(wheelZoom(1, -100, 0, 500)).toBe(4);
    expect(wheelZoom(1, -1000, 0, 500)).toBe(4);
    expect(wheelZoom(1, 1000, 0, 500)).toBe(0.25);
  });
});

describe('drawing double-click zoom', () => {
  it('doubles normally, halves with Shift, and clamps at the shared limits', () => {
    expect(doubleClickZoom(0.75, false)).toBe(1.5);
    expect(doubleClickZoom(1.5, true)).toBe(0.75);
    expect(doubleClickZoom(3, false)).toBe(4);
    expect(doubleClickZoom(0.05, true)).toBe(0.05);
  });
  it('keeps the clicked drawing point anchored through zoom in and out', () => {
    const zoom = doubleClickZoom(0.75, false);
    const left = zoomScroll(300, 120, 0.75, zoom);
    const top = zoomScroll(1000, 220, 0.75, zoom);
    expect((left + 120) / zoom).toBe((300 + 120) / 0.75);
    expect((top + 220) / zoom).toBe((1000 + 220) / 0.75);
    expect(zoomScroll(left, 120, zoom, doubleClickZoom(zoom, true))).toBe(300);
    expect(zoomScroll(top, 220, zoom, doubleClickZoom(zoom, true))).toBe(1000);
  });
});
