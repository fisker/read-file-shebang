import fs from 'node:fs/promises'
import {Buffer} from 'node:buffer'

async function readShebang(file) {
  const fileHandler = await fs.open(file)

  const {bytesRead, buffer} = await fileHandler.read({
    buffer: Buffer.alloc(150),
  })
  await fileHandler.close()
  const firstLine = buffer
    .slice(0, bytesRead)
    .toString('utf8')
    .split(/\r|\n/)[0]

  if (firstLine.startsWith('#!')) {
    return firstLine
  }
}

export default readShebang
