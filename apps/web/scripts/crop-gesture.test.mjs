import test from 'node:test'
import assert from 'node:assert/strict'
import { boundCrop, cropFromGesture } from '../src/traindex/crop.ts'

const crop = { x: .5, y: .4, s: .3 }
const frame = { width: 400, height: 300 }
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`)

test('one finger translates without snapping the crop center to the touch', () => {
  const result = cropFromGesture(crop, [{ x: 120, y: 80 }], [{ x: 160, y: 110 }], frame)
  close(result.x, .6)
  close(result.y, .5)
  close(result.s, .3)
})

test('spreading doubles size and pinching halves it around a stationary midpoint', () => {
  const start = [{ x: 150, y: 100 }, { x: 250, y: 100 }]
  for (const [distance, size] of [[200, .6], [50, .15]]) {
    const next = [{ x: 200 - distance / 2, y: 100 }, { x: 200 + distance / 2, y: 100 }]
    const result = cropFromGesture(crop, start, next, frame)
    close(result.s, size)
    close(result.x, crop.x)
    close(result.y, crop.y)
  }
})

test('two fingers can translate and resize in the same gesture', () => {
  const result = cropFromGesture(crop,
    [{ x: 100, y: 100 }, { x: 200, y: 100 }],
    [{ x: 90, y: 160 }, { x: 290, y: 160 }], frame)
  close(result.x, .6)
  close(result.y, .6)
  close(result.s, .6)
})

test('rebasing after lifting a finger preserves size and avoids a position jump', () => {
  const enlarged = { x: .6, y: .5, s: .6 }
  const result = cropFromGesture(enlarged, [{ x: 290, y: 160 }], [{ x: 290, y: 160 }], frame)
  assert.deepEqual(result, enlarged)
})

test('clamps size and the entire 3:2 rectangle inside portrait and landscape photos', () => {
  for (const ratio of [.5, 1.5, 4]) {
    for (const size of [.001, 3]) {
      const result = boundCrop({ x: -1, y: 2, s: size }, ratio)
      const halfHeight = result.s * ratio / 3
      assert.ok(result.s >= Math.min(.1, 1.5 / ratio))
      assert.ok(result.s <= Math.min(.9, 1.5 / ratio))
      assert.ok(result.x - result.s / 2 >= -1e-9)
      assert.ok(result.x + result.s / 2 <= 1 + 1e-9)
      assert.ok(result.y - halfHeight >= -1e-9)
      assert.ok(result.y + halfHeight <= 1 + 1e-9)
    }
  }
})

test('coincident fingers and zero-size layout never produce invalid geometry', () => {
  const same = [{ x: 100, y: 100 }, { x: 100, y: 100 }]
  const result = cropFromGesture(crop, same, [{ x: 0, y: 0 }, { x: 200, y: 200 }], frame)
  assert.ok(Object.values(result).every(Number.isFinite))
  assert.equal(result.s, crop.s)
  assert.deepEqual(cropFromGesture(crop, same, same, { width: 0, height: 0 }), crop)
})
