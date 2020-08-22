import {
  makeVect,
  fill,
  vectsToPainter,
  blank,
  fish,
  transformPainter,
  over,
  beside,
  above,
  flipHoriz,
  rot,
  rot45,
  rot180,
  rot270,
  quartet,
} from "./pict-lang.js"

function squareLimit(n) {
  function side(n) {
    if (n === 0) {
      return blank
    }
    return quartet(side(n - 1), side(n - 1), rot(t), t)
  }

  function corner(n) {
    if (n == 0) {
      return blank
    }
    return quartet(corner(n - 1), side(n - 1), rot(side(n - 1)), u)
  }

  function nonet(p, q, r, s, t, u, v, w, x) {
    return above(
      beside(p, beside(q, r), 1, 2),
      above(beside(s, beside(t, u), 1, 2), beside(v, beside(w, x), 1, 2)),
      1,
      2
    )
  }

  let fish2 = flipHoriz(rot45(fish))
  let fish3 = rot270(fish2)
  let t = over(fish, over(fish2, fish3))
  let u = over(fish2, rot(fish2), rot180(fish2), rot270(fish2))

  return nonet(
    corner(n),
    side(n),
    rot(rot(rot(corner(n)))),
    rot(side(n)),
    u,
    rot(rot(rot(side(n)))),
    rot(corner(n)),
    rot(rot(side(n))),
    rot(rot(corner(n)))
  )
}

function rhombilleTiling(n) {
  let topRhombus = vectsToPainter(
    [
      makeVect(0, 0.75),
      makeVect(0.5, 1),
      makeVect(1, 0.75),
      makeVect(0.5, 0.5),
      makeVect(0, 0.75),
    ],
    {draw: fill, style: "#A5DEE4"}
  )
  let leftRhombus = vectsToPainter(
    [
      makeVect(0, 0.75),
      makeVect(0.5, 0.5),
      makeVect(0.5, 0),
      makeVect(0, 0.25),
      makeVect(0, 0.75),
    ],
    {draw: fill, style: "#51A8DD"}
  )
  let rightRhombus = vectsToPainter(
    [
      makeVect(1, 0.75),
      makeVect(0.5, 0.5),
      makeVect(0.5, 0),
      makeVect(1, 0.25),
      makeVect(1, 0.75),
    ],
    {draw: fill, style: "#005CAF"}
  )
  let tile = over(topRhombus, leftRhombus, rightRhombus)
  let length = 1 / n
  let halfLength = length / 2
  let quarterLength = halfLength / 2

  let odd = []

  for (let y = -3 * quarterLength; y < 1; y += 2 * length - halfLength) {
    for (let x = 0; x < 1; x += length) {
      odd.push(
        transformPainter(
          tile,
          makeVect(x, y),
          makeVect(x + length, y),
          makeVect(x, y + length)
        )
      )
    }
  }

  let even = []

  for (let y = 0; y < 1; y += 2 * length - halfLength) {
    for (let x = -halfLength; x < 1; x += length) {
      even.push(
        transformPainter(
          tile,
          makeVect(x, y),
          makeVect(x + length, y),
          makeVect(x, y + length)
        )
      )
    }
  }

  return over(...odd, ...even)
}

export {squareLimit, rhombilleTiling}
