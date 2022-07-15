import {createReadStream} from 'node:fs'
import {createInterface} from 'node:readline'

const MAX_HASH_BANG_LENGTH = 150
const FILE_STREAM_OPTIONS = {encoding: 'utf8', end: MAX_HASH_BANG_LENGTH - 1}

async function readShebang(file) {
  const stream = createReadStream(file, FILE_STREAM_OPTIONS)
  const readline = createInterface({input: stream})
  const {value: firstLine} = await readline[Symbol.asyncIterator]().next()

  if (firstLine && firstLine.startsWith('#!')) {
    return firstLine
  }
}

export default readShebang
