import assert from 'node:assert/strict'
import {Buffer} from 'node:buffer'
import fs, {promises as fsPromises} from 'node:fs'
import process from 'node:process'
import test from 'node:test'
import url from 'node:url'
import {isCI} from 'ci-info'
import writeTemporaryFile from 'temp-write'
import readShebang from './index.js'

const TEST_HASH_BANG = '#!/usr/bin/env node'
const MAX_HASH_BANG_LENGTH = 150
const JUNK_PIECE_SIZE = 10 * 1024 // 10KB
const JUNK_DATA = Buffer.alloc(JUNK_PIECE_SIZE).fill('.')

const getShebang = async (options) => {
  if (typeof options === 'string') {
    options = {content: options}
  }

  const {measureTime, junkSize, content} = {
    measureTime: false,
    junkSize: 0,
    content: '',
    ...options,
  }
  const file = await writeTemporaryFile(content)

  if (junkSize) {
    await new Promise((resolve) => {
      const writableStream = fs.createWriteStream(file, {flags: 'a'})
      writableStream.on('finish', resolve)
      const pieces = Math.floor(junkSize / JUNK_PIECE_SIZE)
      for (let index = 0; index < pieces; index++) {
        writableStream.write(JUNK_DATA)
      }
      writableStream.end('.'.repeat(junkSize % JUNK_PIECE_SIZE))
    })

    const stat = await fsPromises.stat(file)
    assert.equal(stat.size, content.length + junkSize)
  } else {
    assert.equal(await fsPromises.readFile(file, 'utf8'), content)
  }

  const startTime = performance.now()
  const result = await readShebang(file)
  const time = performance.now() - startTime

  await fsPromises.unlink(file)

  return measureTime ? {result, time} : result
}

test('main', async () => {
  const fixture = await writeTemporaryFile(TEST_HASH_BANG)
  assert.equal(typeof readShebang(fixture).then, 'function')
  assert.equal(await readShebang(fixture), TEST_HASH_BANG)
  assert.equal(await readShebang(url.pathToFileURL(fixture)), TEST_HASH_BANG)
  // `fs.createReadStream` doesn't accept url string
  await assert.rejects(() => readShebang(url.pathToFileURL(fixture).href))
  await fsPromises.unlink(fixture)

  const promise = readShebang(new URL('./non-existing-file', import.meta.url))
  assert.equal(typeof promise.then, 'function')
  promise.catch(() => {})
  await assert.rejects(
    () => readShebang(new URL('./non-existing-file', import.meta.url)),
    {name: 'Error', code: 'ENOENT'},
  )
  await assert.rejects(() => readShebang(new URL('./', import.meta.url)), {
    name: 'Error',
    code: 'EISDIR',
  })
})

test('contents', async () => {
  assert.equal(await getShebang(`\n${TEST_HASH_BANG}`), undefined)
  assert.equal(await getShebang(`\r${TEST_HASH_BANG}`), undefined)
  assert.equal(await getShebang(`\r\n${TEST_HASH_BANG}`), undefined)
  assert.equal(await getShebang(` ${TEST_HASH_BANG}`), undefined)
  assert.equal(await getShebang(`${TEST_HASH_BANG}\n`), TEST_HASH_BANG)
  assert.equal(await getShebang(`${TEST_HASH_BANG}\r`), TEST_HASH_BANG)
  assert.equal(await getShebang(`${TEST_HASH_BANG}\r\n`), TEST_HASH_BANG)

  assert.equal(
    // eslint-disable-next-line unicorn/no-await-expression-member
    (await getShebang(`#!${'-'.repeat(1024)}`)).length,
    MAX_HASH_BANG_LENGTH,
  )
})

test('performance', async () => {
  // 4GB on CI, 5MB on local
  const SIZE = (isCI ? 4 * 1024 : 5) * 1024 * 1024
  let MAXIMUM_TIME = 10
  if (isCI) {
    MAXIMUM_TIME = process.platform === 'win32' ? 1500 : 200
  }

   
  {
    const {result, time} = await getShebang({
      content: `${TEST_HASH_BANG}\n`,
      measureTime: true,
      junkSize: SIZE,
    })

    assert.equal(result, TEST_HASH_BANG)
    assert.ok(
      time < MAXIMUM_TIME,
      `Should get result in less than ${MAXIMUM_TIME}ms, got ${time}`,
    )
  }

   
  {
    const {result, time} = await getShebang({
      content: TEST_HASH_BANG,
      measureTime: true,
      junkSize: SIZE,
    })

    assert.equal(result.length, MAX_HASH_BANG_LENGTH)
    assert.ok(
      time < MAXIMUM_TIME,
      `Should get result in less than ${MAXIMUM_TIME}ms, got ${time}`,
    )
  }

   
  {
    const {result, time} = await getShebang({
      content: '',
      measureTime: true,
      junkSize: SIZE,
    })

    assert.equal(result, undefined)
    assert.ok(
      time < MAXIMUM_TIME,
      `Should get result in less than ${MAXIMUM_TIME}ms, got ${time}`,
    )
  }
})
