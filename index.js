import {createReadStream} from 'node:fs'
import {createInterface} from 'node:readline'

async function readShebang(file) {
  const readline = createInterface({
    input: createReadStream(file, {encoding: 'utf8', end: 149}),
    crlfDelay: 0,
  })

  const {value: firstLine} = await readline[Symbol.asyncIterator]().next()

  if (firstLine && firstLine.startsWith('#!')) {
    return firstLine
  }
}

export default readShebang
