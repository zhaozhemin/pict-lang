export {
  makeVect, addVect, subVect, scaleVect, zeroVect,
  makeFrame, makeRelativeFrame, frameCoordMap,
  makeSegment,
  drawLine, line, stroke, fill,
  segmentsToPainter, vectsToPainter, svgPathToPainter, colorToPainter,
  blank, fish, heart, black, grey,
  transformPainter, over, beside, above, flipVert, flipHoriz,
  identity, rot, rot45, rot180, rot270, quartet,
  init,
} from './pict-lang.js'

export {fishPath, heartPath} from './paths.js'
