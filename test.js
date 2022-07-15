import assert from 'node:assert/strict'
import fs, {promises as fsPromises} from 'node:fs'
import url from 'node:url'
import test from 'node:test'
import writeTemporaryFile from 'temp-write'
import {isCI} from 'ci-info'
import readShebang from './index.js'

const TEST_HASH_BANG = '#!/usr/bin/env node'
const MAX_HASH_BANG_LENGTH = 150
const JUNK_PIECES_SIZE = 10 * 1024 // 10KB
const JUNK_STRING = '-'.repeat(JUNK_PIECES_SIZE)

const getShebang = async (options) => {
  if (typeof options === 'string') {
    options = {content: options}
  }

  const {measureTime, junkSize, content} = {
    measureTime: false,
    junkSize: 0,
    ...options,
  }
  const file = await writeTemporaryFile(content)

  if (junkSize) {
    const writableStream = fs.createWriteStream(file, {flags: 'a'})
    for (let index = 0; index < junkSize / JUNK_PIECES_SIZE; index++) {
      writableStream.write(JUNK_STRING)
    }
    writableStream.end()
  } else {
    assert.equal(await fsPromises.readFile(file, 'utf8'), content)
  }

  const startTime = performance.now()
  const result = await readShebang(file)
  const time = performance.now() - startTime

  // await fsPromises.unlink(file)

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

  // eslint-disable-next-line no-lone-blocks
  {
    const {result, time} = await getShebang({
      content: `${TEST_HASH_BANG}\n`,
      measureTime: true,
      junkSize: SIZE,
    })

    assert.equal(result, TEST_HASH_BANG)
    assert(time < 10, `Should get result in less than 10ms, got ${time}`)
  }

  // eslint-disable-next-line no-lone-blocks
  {
    const {result, time} = await getShebang({
      content: TEST_HASH_BANG,
      measureTime: true,
      junkSize: SIZE,
    })

    assert.equal(result.length, MAX_HASH_BANG_LENGTH)
    assert(time < 10, `Should get result in less than 10ms, got ${time}`)
  }

  // eslint-disable-next-line no-lone-blocks
  {
    const {result, time} = await getShebang({
      content: '',
      measureTime: true,
      junkSize: SIZE,
    })

    assert.equal(result, undefined)
    assert(time < 10, `Should get result in less than 10ms, got ${time}`)
  }
})
