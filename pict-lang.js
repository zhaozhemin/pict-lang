import {fishPath, heartPath} from './paths.js'

// Vectors
//
// Represent point in the unit square or in the canvas.

function makeVect(x, y) {
  return Object.freeze({x, y})
}

function addVect(...args) {
  let v = args.reduce((a, c) => ({x: a.x + c.x, y: a.y + c.y}))
  return makeVect(v.x, v.y)
}

function subVect(v, w) {
  return makeVect(v.x - w.x, v.y - w.y)
}

function scaleVect(s, v) {
  return makeVect(s * v.x, s * v.y)
}

function isSameVect(v, w) {
  return v.x === w.x && v.y === w.y
}

export const zeroVect = makeVect(0, 0)

export {makeVect, addVect, subVect, scaleVect}

// Frames
//
// A frame is made up of three vectors: an origin and two edges. Here, edge*
// specify the relative distance to the origin; corner* the absolute point in
// the frame. For instance:
//
// o:  0.5 0
// e1: 0.5 0
// e2: 0   0.5
//
// is the same frame as
//
// o:  0.5 0
// c1: 1   0
// c2: 0.5 0.5

function makeFrame(origin, edge1, edge2) {
  return Object.freeze({origin, edge1, edge2})
}

/**
 * Make a new frame relative to the given frame.
 *
 * For example, to make a frame which is the left half of the given frame,
 * supply the three vectors as 0 0, 0.5 0, 0 1
 */

function makeRelativeFrame(origin, corner1, corner2) {
  return frame => {
    let tr = frameCoordMap(frame)
    let newOrigin = tr(origin)
    return makeFrame(
      newOrigin,
      subVect(tr(corner1), newOrigin),
      subVect(tr(corner2), newOrigin)
    )
  }
}

/**
 * Map the point in the unit square to the point in the given frame.
 */
function frameCoordMap(frame) {
  return v => {
    return addVect(
      frame.origin,
      scaleVect(v.x, frame.edge1),
      scaleVect(v.y, frame.edge2)
    )
  }
}

export {makeFrame, makeRelativeFrame, frameCoordMap}

// Segments
//
// Represent a line.

function makeSegment(start, end) {
  return {start: start, end: end}
}

export {makeSegment}

// Drawing Functions

/**
 * Draw a line between two vectors.
 */
function drawLine(v, w) {
  return ctx => line(v, w)(ctx)
}

/**
 * Draw lines among given vectors.
 */
function line(v0, ...args) {
  return ctx => {
    ctx.moveTo(v0.x, v0.y)
    args.forEach(v => ctx.lineTo(v.x, v.y))
  }
}

const stroke = CanvasRenderingContext2D.prototype.stroke

const fill = CanvasRenderingContext2D.prototype.fill

export {drawLine, line, stroke, fill}

// Primitive Painters

/**
 * Create a painter from a list of segments.
 *
 * For every segment in the list, first we moveTo the start, then lineTo the
 * end. In other words, every segment is a sub-path. Fill won't work.
 */
function segmentsToPainter(segments, {draw=stroke, style='#000'} = {}) {
  return (frame, ctx) => {
    let tr = frameCoordMap(frame)
    ctx.beginPath()
    segments.forEach(seg => drawLine(tr(seg.start), tr(seg.end))(ctx))
    ctx[`${draw.name}Style`] = style
    draw.call(ctx)
  }
}

/**
 * Create a painter from a list of vectors.
 *
 * We moveTo the first vector, then lineTo rest vectors.
 */
function vectsToPainter(vects, {draw=stroke, style='#000'} = {}) {
  return (frame, ctx) => {
    let tr = frameCoordMap(frame)
    ctx.beginPath()
    line(...vects.map(v => tr(v)))(ctx)
    ctx[`${draw.name}Style`] = style
    draw.call(ctx)
  }
}

/**
 * Create a painter from a SVG path.
 *
 * Coordinates must be 0 and 1.
 */
function svgPathToPainter(path, {draw=stroke, style='#000'} = {}) {
  let elem = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  elem.setAttribute('d', path)
  // getPathData is defined in a path-data-polyfill.js
  let data = elem.getPathData()

  return (frame, ctx) => {
    let newPath = []
    let tr = frameCoordMap(frame)

    for (let {type, values} of data) {
      newPath.push(type)

      let i = 0

      while (i < values.length) {
        if (type === 'H' || type === 'h') {
          let v = tr(makeVect(values[i], y))
          newPath.push(v.x)
          i += 1
        } else if (type === 'V' || type === 'v') {
          let v = tr(makeVect(x, 1 - values[i]))
          newPath.push(v.y)
          i += 1
        } else {
          let v = tr(makeVect(values[i], 1 - values[i + 1]))
          newPath.push(v.x)
          newPath.push(v.y)
          i += 2
        }
      }
    }

    ctx[`${draw.name}Style`] = style
    draw.call(ctx, new Path2D(newPath.join(' ')))
  }
}

/**
 * Create a color painter which fills the frame with the given color.
 */
function colorToPainter({draw=fill, style='#000'} = {}) {
  let vects = [
    zeroVect, makeVect(1, 0), makeVect(1, 1), makeVect(0, 1), zeroVect
  ]

  return vectsToPainter(vects, {draw: draw, style: style})
}

export {segmentsToPainter, vectsToPainter, svgPathToPainter, colorToPainter}

// Built-in Painters

export const blank = (frame, ctx) => undefined

export const fish = svgPathToPainter(fishPath)

export const heart = svgPathToPainter(heartPath, {draw: fill})

export const black = colorToPainter()

export const grey = colorToPainter({style: '#666767'})

// Higher Order Painters

/**
 * Create a new painter, when called, paint the picture in a transformed frame.
 * We don't have to know how a painter works to transform it. We simply
 * transform the frame in which the picture will fit. For example, suppose we
 * want to flip the picture vertically, we only need to flip the frame, that
 * is, create a new frame whose origin is 1 0 instead of 0 0, corner1 1 1
 * instead of 1 0, corner2 0 0 instead of 1 0.
 *
 * origin, corner1, corner2 are all vectors in the unit square.
 */
function transformPainter(painter, origin, corner1, corner2) {
  return (frame, ctx) => {
    painter(makeRelativeFrame(origin, corner1, corner2)(frame), ctx)
  }
}

/**
 * Put serveral painters in the same frame.
 */
function over(...painters) {
  return (frame, ctx) => painters.forEach(painter => painter(frame, ctx))
}

/**
 * Put two painters side by side.
 */
function beside(painter1, painter2, m=1, n=1) {
  let point = Number((m / (m + n)).toFixed(2))
  let splitVect = makeVect(point, 0)

  return over(
    transformPainter(painter1, zeroVect, splitVect, makeVect(0, 1)),
    transformPainter(painter2, splitVect, makeVect(1, 0), makeVect(point, 1))
  )
}

/**
 * Put one painter above another.
 */
function above(painter1, painter2, m=1, n=1) {
  let point = Number((n / (m + n)).toFixed(2))
  let splitVect = makeVect(0, point)

  return over(
    transformPainter(painter1, splitVect, makeVect(1, point), makeVect(0, 1)),
    transformPainter(painter2, zeroVect, makeVect(1, 0), splitVect)
  )
}

/**
 * Flip the painter vertically.
 */
function flipVert(painter) {
  return transformPainter(
    painter,
    makeVect(0, 1), makeVect(1, 1), zeroVect
  )
}

/**
 * Flip the painter horizontally.
 */
function flipHoriz(painter) {
  return transformPainter(
    painter,
    makeVect(1, 0), zeroVect, makeVect(1, 1)
  )
}

/**
 * Do nothing.
 */
function identity(painter) {
  return painter
}

/**
 * Rotate the painter 90 degree counterclockwise.
 */
function rot(painter) {
  return transformPainter(
    painter, makeVect(1, 0), makeVect(1, 1), zeroVect
  )
}

/**
 * Rotate the painter 45 degree counterclockwise and shrink its size by square
 * root of 2.
 */
function rot45(painter) {
  return transformPainter(
    painter, makeVect(0.5, 0.5), makeVect(1, 1), makeVect(0, 1)
  )
}

/**
 * Rotate the painter 180 degree counterclockwise.
 */
function rot180(painter) {
  return rot(rot(painter))
}

/**
 * Rotate the painter 270 degree counterclockwise.
 */
function rot270(painter) {
  return rot(rot(rot(painter)))
}

function quartet(tl, tr, bl, br) {
  return above(beside(tl, tr), beside(bl, br))
}

export {
  transformPainter, over, beside, above, flipVert, flipHoriz,
  identity, rot, rot45, rot180, rot270, quartet
}

// Initialization

export function init(canvas) {
  if (canvas == null) {
    canvas = document.createElement('canvas')
    canvas.height = 300
  }

  let ctx = canvas.getContext('2d')
  let frame = makeFrame(
    makeVect(0, canvas.height),
    makeVect(canvas.width, 0),
    makeVect(0, -canvas.height)
  )

  return [canvas, ctx, frame]
}
