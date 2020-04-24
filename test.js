import * as p from './pict-lang.js'

let assert = chai.assert

describe('vect', function() {
  let v = p.makeVect(1, 2)
  let w = p.makeVect(2, 3)
  let z = p.makeVect(3, 4)

  it('make vect', function() {
    assert.deepEqual(p.zeroVect, {x: 0, y: 0})
    assert.deepEqual(v, {x: 1, y: 2})
  })

  it('add vect', function() {
    assert.deepEqual(p.addVect(v, w), {x: 3, y: 5})
    assert.deepEqual(p.addVect(v, w, z), {x: 6, y: 9})
  })

  it('sub vect', function() {
    assert.deepEqual(p.subVect(w, v), {x: 1, y: 1})
  })

  it('scale vect', function() {
    assert.deepEqual(p.scaleVect(1, v), v)
    assert.deepEqual(p.scaleVect(3, v), {x: 3, y: 6})
  })

})

describe('frame', function() {
  let f = p.makeFrame(p.zeroVect, p.makeVect(100, 0), p.makeVect(0, 100))
  let g = p.makeFrame(p.zeroVect, p.makeVect(200, 0), p.makeVect(0, 200))

  it('make frame', function() {
    assert.deepEqual(f, {
      origin: {x: 0, y: 0},
      edge1: {x: 100, y: 0},
      edge2: {x: 0, y: 100}
    })
  })

  it('make relative frame', function() {
    let o = p.makeVect(0.5, 0)
    let c1 = p.makeVect(0.75, 0)
    let c2 = p.makeVect(0.5, 0.25)

    assert.deepEqual(
      p.makeRelativeFrame(o, c1, c2)(f),
      {origin: {x: 50, y: 0}, edge1: {x: 25, y: 0}, edge2: {x: 0, y: 25}}
    )

    assert.deepEqual(
      p.makeRelativeFrame(o, c1, c2)(g),
      {origin: {x: 100, y: 0}, edge1: {x: 50, y: 0}, edge2: {x: 0, y: 50}}
    )

  })

  it('map unit square coordinates to frame coordinates', function() {
    assert.deepEqual(p.frameCoordMap(f)(p.zeroVect), f.origin)
    assert.deepEqual(p.frameCoordMap(f)(p.makeVect(0.5, 0.5)), {x: 50, y: 50})
  })

})

describe('segment', function() {

  it('make segment', function() {
    assert.deepEqual(
      p.makeSegment(p.zeroVect, p.makeVect(1, 1)),
      {start: {x: 0, y: 0}, end: {x: 1, y: 1}}
    )
  })

})

describe('higher order painters', function() {
  let x
  let y
  let painter

  beforeEach(function() {
    x = randomInt(0, 300)
    y = randomInt(0, 300)
    painter = randomColorPalette()
  })

  it('transform painter', function() {
    let painter = p.transformPainter(
      p.black,
      p.zeroVect,
      p.makeVect(0.5, 0),
      p.makeVect(0, 0.5)
    )
    assert.deepEqual(pixelColor(painter, 75, 75), [0, 0, 0, 0])  // tl
    assert.deepEqual(pixelColor(painter, 175, 75), [0, 0, 0, 0])  // tr
    assert.deepEqual(pixelColor(painter, 75, 175), [0, 0, 0, 255])  // bl
    assert.deepEqual(pixelColor(painter, 175, 175), [0, 0, 0, 0])  // br
  })

  it('beside', function() {
    let painter = p.beside(p.beside(p.black, p.blank), p.grey)
    assert.deepEqual(pixelColor(painter, 25, 100), [0, 0, 0, 255])
    assert.deepEqual(pixelColor(painter, 100, 100), [0, 0, 0, 0])
    assert.deepEqual(pixelColor(painter, 175, 100), [102, 103, 103, 255])
  })

  it('above', function() {
    let painter = p.above(p.above(p.black, p.blank), p.grey)
    assert.deepEqual(pixelColor(painter, 100, 25), [0, 0, 0, 255])
    assert.deepEqual(pixelColor(painter, 100, 100), [0, 0, 0, 0])
    assert.deepEqual(pixelColor(painter, 100, 175), [102, 103, 103, 255])
  })

  it('flip vect', function() {
    assert.deepEqual(
      pixelColor(painter, x, y),
      pixelColor(p.flipVert(p.flipVert(painter)), x, y)
    )
    assert.notDeepEqual(
      pixelColor(painter, x, y),
      pixelColor(p.flipVert(painter), x, y)
    )
  })

  it('flip horiz', function() {
    assert.deepEqual(
      pixelColor(painter, x, y),
      pixelColor(p.flipHoriz(p.flipHoriz(painter)), x, y)
    )
    assert.notDeepEqual(
      pixelColor(painter, x, y),
      pixelColor(p.flipHoriz(painter), x, y)
    )
  })

  it('rot 90 counterclockwise', function() {
    assert.deepEqual(
      pixelColor(painter, x, y),
      pixelColor(p.rot(p.rot(p.rot(p.rot(painter)))), x, y)
    )
    assert.notDeepEqual(
      pixelColor(painter, x, y),
      pixelColor(p.rot(painter), x, y)
    )
  })

  it('rot 45', function() {
    assert.deepEqual(pixelColor(p.rot45(p.black), 150, 100), [0, 0, 0, 255])
    assert.deepEqual(pixelColor(p.rot45(p.black), 100, 200), [0, 0, 0, 0])
    assert.deepEqual(pixelColor(p.rot45(p.black), 275, 50), [0, 0, 0, 0])
  })

  it('mixing higher order painters', function() {
    assert.deepEqual(
      pixelColor(p.rot(p.above(painter, painter)), x, y),
      pixelColor(p.beside(p.rot(painter), p.rot(painter)), x, y)
    )
    assert.deepEqual(
      pixelColor(p.rot(p.beside(painter, painter)), x, y),
      pixelColor(p.above(p.rot(painter), p.rot(painter)), x, y)
    )
    assert.deepEqual(
      pixelColor(p.flipVert(p.beside(painter, painter)), x, y),
      pixelColor(p.beside(p.flipVert(painter), p.flipVert(painter)), x, y)
    )
  })

})


// utils

function colorIndexes(x, y, width) {
  let red = y * (width * 4) + x * 4;
  return [red, red + 1, red + 2, red + 3];
}

function pixelColor(painter, x, y) {
  let canvas = document.createElement('canvas')
  canvas.height = 300
  let ctx = canvas.getContext('2d')
  painter(p.unitSquare)(ctx)
  let data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  let rgba = colorIndexes(x, y, canvas.width)
  return rgba.map(i => data[i])
}

function randomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min
}

function randomRgbVal() {
  return randomInt(0, 256)
}

function randomRgbFuncString() {
  return `rgba(${randomRgbVal()}, ${randomRgbVal()}, ${randomRgbVal()}, 1)`
}

function randomColorPalette() {
  let tiles = []

  for (let i = 0; i < 4; i += 1) {
    tiles.push(
      p.quartet(
        p.colorToPainter({style: randomRgbFuncString()}),
        p.colorToPainter({style: randomRgbFuncString()}),
        p.colorToPainter({style: randomRgbFuncString()}),
        p.colorToPainter({style: randomRgbFuncString()})
      )
    )
  }

  return frame => ctx => p.quartet(...tiles)(frame)(ctx)
}
