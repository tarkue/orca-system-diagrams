import { clampZoom, type Size } from './viewport';

export interface ElementBounds extends Size { x: number; y: number }
export function focusElement(viewport: Size, drawing: Size, target: ElementBounds, currentZoom: number) {
  const zoom = clampZoom(Math.max(1, currentZoom));
  const centered = (position: number, extent: number, viewportExtent: number, drawingExtent: number) =>
    Math.max(0, Math.min((position + extent / 2) * zoom - viewportExtent / 2, drawingExtent * zoom - viewportExtent));
  return {zoom, left:centered(target.x,target.width,viewport.width,drawing.width), top:centered(target.y,target.height,viewport.height,drawing.height)};
}
