export type Crop = { x: number; y: number; s: number }
export type CropPoint = { x: number; y: number }

/** Width fraction and centered 3:2 crop, fully contained in the oriented image. */
export function boundCrop(crop: Crop, imageRatio: number): Crop {
  const minimum = Math.min(0.1, 1.5 / imageRatio)
  const maximum = Math.min(0.9, 1.5 / imageRatio)
  const s = Math.min(maximum, Math.max(minimum, crop.s))
  const halfX = s / 2
  const halfY = s * imageRatio / 3
  return {
    x: Math.min(1 - halfX, Math.max(halfX, crop.x)),
    y: Math.min(1 - halfY, Math.max(halfY, crop.y)),
    s,
  }
}

/** Rebase start points whenever fingers are added/removed; coordinates are CSS pixels. */
export function cropFromGesture(
  start: Crop,
  initial: CropPoint[],
  current: CropPoint[],
  frame: { width: number; height: number },
): Crop {
  if (!initial.length || initial.length !== current.length || !frame.width || !frame.height) return start
  const center = (points: CropPoint[]) => ({
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  })
  const before = center(initial)
  const after = center(current)
  let scale = 1
  if (initial.length === 2) {
    const distance = (points: CropPoint[]) => Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)
    const previousDistance = distance(initial)
    // Coincident fingers must never create an infinite/NaN crop.
    if (previousDistance > 1) scale = distance(current) / previousDistance
  }
  return {
    x: start.x + (after.x - before.x) / frame.width,
    y: start.y + (after.y - before.y) / frame.height,
    s: start.s * scale,
  }
}
