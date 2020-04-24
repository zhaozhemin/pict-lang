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

const unitSquare = makeFrame(zeroVect, makeVect(1, 0), makeVect(0, 1))

export {makeFrame, makeRelativeFrame, frameCoordMap, unitSquare}

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

// Transformation

/**
 * Calculate the distance between two vects.
 */
function calcDistance(v1, v2) {
  let {x: v1x, y: v1y} = v1
  let {x: v2x, y: v2y} = v2
  return Math.sqrt((v1x - v2x) ** 2 + (v1y - v2y) ** 2)
}

/**
 * Set and restore the transformation matrix according to canvas size and frame.
 */
function withTransform(f) {
  return frame => ctx => {
    ctx.save()
    let {width, height} = ctx.canvas
    // Scale the unit square to the size of the canvas and flip its y-axis.
    ctx.transform(width, 0, 0, -height, 0, height)
    // Apply current frame in which the picture will be drawn.
    ctx.transform(...frameToTransformation(frame))
    let {origin, edge1, edge2} = transformationToFrame(ctx.getTransform())
    let frameWidth = calcDistance(addVect(origin, edge1), origin)
    let frameHeight = calcDistance(addVect(origin, edge2), origin)
    // As to why we need to set lineWidth, please see the discussion at
    // https://github.com/sicp-lang/sicp/issues/33
    // I have to manually calculate the width, which is probably not ideal.
    ctx.lineWidth = 1 / Math.min(frameWidth, frameHeight)
    f(frame)(ctx)
    ctx.restore()
  }
}

function frameToTransformation(frame) {
  let {origin, edge1, edge2} = frame
  return [edge1.x, edge1.y, edge2.x, edge2.y, origin.x, origin.y]
}

function transformationToFrame(matrix) {
  let {a, b, c, d, e, f} = matrix
  let frame = makeFrame(makeVect(e, f), makeVect(a, b), makeVect(c, d))
  return frame
}

// Primitive Painters

/**
 * Create a painter from a list of segments.
 *
 * For every segment in the list, first we moveTo the start, then lineTo the
 * end. In other words, every segment is a sub-path. Fill won't work.
 */
function segmentsToPainter(segments, {draw=stroke, style='#000'} = {}) {
  let f = frame => ctx => {
    ctx.beginPath()
    segments.forEach(seg => drawLine(seg.start, seg.end)(ctx))
    ctx[`${draw.name}Style`] = style
    draw.call(ctx)
  }

  return withTransform(f)
}

/**
 * Create a painter from a list of vectors.
 *
 * We moveTo the first vector, then lineTo rest vectors.
 */
function vectsToPainter(vects, {draw=stroke, style='#000'} = {}) {
  let f = frame => ctx => {
    ctx.beginPath()
    line(...vects)(ctx)
    ctx[`${draw.name}Style`] = style
    draw.call(ctx)
  }

  return withTransform(f)
}

/**
 * Create a painter from a SVG path.
 *
 * Coordinates must be 0 and 1.
 */
// TODO: Currently the output picture will be upside down, because the
// coordinate system is different between the unit square and the canvas. In
// the unit square, the origin is the bottom left corner, whereas in the
// canvas, the origin is the top left corner. Need to figure out the correct
// transformation matrix.
function svgPathToPainter(path, {draw=stroke, style='#000'} = {}) {
  let f = frame => ctx => {
    draw.call(ctx, new Path2D(path))
  }

  return withTransform(f)
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

export const blank = frame => ctx => undefined

export const fish = flipVert(svgPathToPainter(fishPath))

export const heart = flipVert(svgPathToPainter(heartPath, {draw: fill}))

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
  return frame => ctx => {
    let newFrame = makeRelativeFrame(origin, corner1, corner2)(frame)
    painter(newFrame)(ctx)
  }
}

/**
 * Put serveral painters in the same frame.
 */
function over(...painters) {
  return frame => ctx => painters.forEach(painter => painter(frame)(ctx))
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
