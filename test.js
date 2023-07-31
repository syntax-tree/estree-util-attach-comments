/**
 * @typedef {import('estree').Comment} Comment
 * @typedef {import('estree').Node} Nodes
 * @typedef {import('estree').Program} Program
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import {parse as acornParse} from 'acorn'
import recast from 'recast'
import {visit} from 'estree-util-visit'
import {attachComments} from './index.js'

test('attachComments', async function (t) {
  await t.test('should expose the public api', async function () {
    assert.deepEqual(Object.keys(await import('./index.js')).sort(), [
      'attachComments'
    ])
  })

  await t.test('should support an empty document', async function () {
    assert.equal(recast.print(attachComments(...parse(''))).code, '')
  })

  await t.test('should support no comments', async function () {
    assert.equal(recast.print(attachComments(...parse('a + 1'))).code, 'a + 1;')
  })

  await t.test('should support a single block comment', async function () {
    assert.equal(
      recast.print(attachComments(...parse('/* ! */'))).code,
      '/* ! */\n'
    )
  })

  await t.test('should support a single line comment', async function () {
    assert.equal(recast.print(attachComments(...parse('// !'))).code, '// !\n')
  })

  await t.test('should support some comments', async function () {
    assert.equal(
      recast.print(
        attachComments(
          ...parse('/* 1 */ function a (/* 2 */b) { return b + 1 }')
        )
      ).code,
      '/* 1 */\nfunction a(\n    /* 2 */\n    b\n) {\n    return b + 1;\n}'
    )
  })

  await t.test('should support a bunch of block comments', async function () {
    assert.equal(
      recast.print(
        attachComments(
          ...parse(
            '/* 1 */ function /* 2 */ a /* 3 */ (/* 4 */b) /* 5 */ { /* 6 */ return /* 7 */ b + /* 8 */ 1 /* 9 */ }'
          )
        )
      ).code,
      '/* 1 */\nfunction /* 2 */\na(\n    /* 3 */\n    /* 4 */\n    b\n) /* 5 */\n{\n    /* 6 */\n    return (\n        /* 7 */\n        b + /* 8 */\n        1\n    );\n}/* 9 */'
    )
  })

  await t.test('should support some more comments', async function () {
    // Recast parses `4` as “dangling”:
    // <https://github.com/benjamn/recast/blob/dd7c5ec/lib/comments.ts#L255-L256>
    // But apprently doesn’t serialize it?
    assert.equal(
      recast.print(
        attachComments(...parse('/* 1 */ a /* 2 */ = /* 3 */ { /* 4 */ }'))
      ).code,
      '/* 1 */\na = /* 2 */\n/* 3 */\n{};'
    )
  })

  await t.test('should support a bunch of line comments', async function () {
    assert.equal(
      recast.print(
        attachComments(
          ...parse(
            '// 1\nfunction // 2\na // 3\n(// 4\nb) // 5\n { // 6\n return b + // 7\n 1 // 8\n }'
          )
        )
      ).code,
      '// 1\nfunction // 2\na(\n    // 3\n    // 4\n    b\n) // 5\n{\n    // 6\n    return b + // 7\n    1;\n}// 8'
    )
  })

  await t.test(
    'should not fail on a tree w/o positional info',
    async function () {
      /** @type {Array<Comment>} */
      const comments = []
      /** @type {Program} */
      // @ts-expect-error: acorn looks like estree.
      const tree = acornParse('/* 1 */ a /* 2 */ + /* 3 */ 1', {
        ecmaVersion: 2020,
        // @ts-expect-error: acorn looks like estree.
        onComment: comments
      })

      removePositions(tree)

      assert.equal(recast.print(attachComments(tree, comments)).code, 'a + 1;')
    }
  )

  await t.test('should not fail w/o comments', async function () {
    /** @type {Array<Comment>} */
    const comments = []
    /** @type {Program} */
    // @ts-expect-error: acorn looks like estree.
    const tree = acornParse('1 + 1', {
      ecmaVersion: 2020,
      // @ts-expect-error: acorn looks like estree.
      onComment: comments
    })

    assert.equal(recast.print(attachComments(tree)).code, '1 + 1;')
  })

  await t.test(
    'should not fail on comments w/o positional info',
    async function () {
      /** @type {Array<Comment>} */
      const comments = []
      /** @type {Program} */
      // @ts-expect-error: acorn looks like estree.
      const tree = acornParse('/* 1 */ a /* 2 */ + /* 3 */ 1', {
        ecmaVersion: 2020,
        // @ts-expect-error: acorn looks like estree.
        onComment: comments
      })

      removePositions(comments)

      assert.equal(recast.print(attachComments(tree, comments)).code, 'a + 1;')
    }
  )

  await t.test('should use `range`s', async function () {
    /** @type {Array<Comment>} */
    const comments = []
    /** @type {Program} */
    // @ts-expect-error: acorn looks like estree.
    const tree = acornParse('/* 1 */ a /* 2 */ + /* 3 */ 1', {
      ecmaVersion: 2020,
      ranges: true,
      // @ts-expect-error: acorn looks like estree.
      onComment: comments
    })

    removePositions(tree)

    assert.equal(
      recast.print(attachComments(tree, comments)).code,
      '/* 1 */\na + /* 2 */\n/* 3 */\n1;'
    )
  })

  await t.test('should use `loc`s', async function () {
    /** @type {Array<Comment>} */
    const comments = []
    /** @type {Program} */
    // @ts-expect-error: acorn looks like estree.
    const tree = acornParse('/* 1 */ a /* 2 */ + /* 3 */ 1', {
      ecmaVersion: 2020,
      locations: true,
      // @ts-expect-error: acorn looks like estree.
      onComment: comments
    })

    removePositions(tree)

    assert.equal(
      recast.print(attachComments(tree, comments)).code,
      '/* 1 */\na + /* 2 */\n/* 3 */\n1;'
    )
  })
})

/**
 * @param {string} doc
 * @returns {[Program, Array<Comment>]}
 */
function parse(doc) {
  /** @type {Array<Comment>} */
  const comments = []
  /** @type {Program} */
  // @ts-expect-error: acorn looks like estree.
  const tree = acornParse(doc, {ecmaVersion: 2020, onComment: comments})
  return [tree, comments]
}

/**
 * @param {Array<Comment | Nodes> | Comment | Nodes} value
 * @returns {undefined}
 */
function removePositions(value) {
  visit(
    // @ts-expect-error: comments and arrays are fine.
    value,
    /**
     * @param {Nodes} node
     */
    function (node) {
      // @ts-expect-error: acorn-specific extension.
      delete node.start
      // @ts-expect-error: acorn-specific extension.
      delete node.end
    }
  )
}
