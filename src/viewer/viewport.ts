export interface Size { width: number; height: number }
export const clampZoom = (zoom: number) => Math.min(4, Math.max(0.05, zoom));
export const scaledSize = (size: Size, zoom: number): Size => ({width: size.width * zoom, height: size.height * zoom});
export const fitZoom = (viewport: Size, drawing: Size) => clampZoom(Math.min(1, (viewport.width - 32) / drawing.width, (viewport.height - 32) / drawing.height));
export const zoomScroll = (scroll: number, pointer: number, before: number, after: number) => Math.max(0, (scroll + pointer) * after / before - pointer);

// Long diagrams open legibly; explicit Fit remains available for an overview.
export const initialZoom = (viewport: Size, drawing: Size) => Math.max(0.75, fitZoom(viewport, drawing));

export const ZOOM_STOPS = [0.05, 0.1, 0.25, 0.5, 1, 2, 3, 4] as const;
export function stepZoom(zoom: number, direction: 1 | -1): number {
  if(direction === 1) return ZOOM_STOPS.find(stop => stop > zoom + 1e-9) ?? 4;
  return [...ZOOM_STOPS].reverse().find(stop => stop < zoom - 1e-9) ?? 0.05;
}
export function wheelZoom(zoom: number, delta: number, mode: number, pageHeight: number): number {
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? pageHeight : 1);
  const boundedDelta = Math.max(-100, Math.min(100, pixels));
  return clampZoom(zoom * Math.pow(2, -boundedDelta / 50));
}
export const doubleClickZoom = (zoom: number, shift: boolean) => clampZoom(zoom * (shift ? 0.5 : 2));
