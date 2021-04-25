import test from 'tape'
import {parse as acornParse} from 'acorn'
import recast from 'recast'
import {visit} from 'estree-util-visit'
import {attachComments} from './index.js'

/**
 * @typedef {import('estree').BaseNode} EstreeNode
 * @typedef {import('estree').Program} EstreeProgram
 * @typedef {import('estree').Comment & {leading: boolean, trailing: boolean}} EstreeComment
 */

test('estree-attach-comments (recast)', function (t) {
  t.equal(
    recast.print(attachComments(...parse(''))).code,
    '',
    'should support an empty document'
  )

  t.equal(
    recast.print(attachComments(...parse('a + 1'))).code,
    'a + 1;',
    'should support no comments'
  )

  t.equal(
    recast.print(attachComments(...parse('/* ! */'))).code,
    '/* ! */\n',
    'should support a single block comment'
  )

  t.equal(
    recast.print(attachComments(...parse('// !'))).code,
    '// !\n',
    'should support a single line comment'
  )

  t.equal(
    recast.print(
      attachComments(...parse('/* 1 */ function a (/* 2 */b) { return b + 1 }'))
    ).code,
    '/* 1 */\nfunction a(\n    /* 2 */\n    b\n) {\n    return b + 1;\n}',
    'should support some comments'
  )

  t.equal(
    recast.print(
      attachComments(
        ...parse(
          '/* 1 */ function /* 2 */ a /* 3 */ (/* 4 */b) /* 5 */ { /* 6 */ return /* 7 */ b + /* 8 */ 1 /* 9 */ }'
        )
      )
    ).code,
    '/* 1 */\nfunction /* 2 */\na(\n    /* 3 */\n    /* 4 */\n    b\n) /* 5 */\n{\n    /* 6 */\n    return (\n        /* 7 */\n        b + /* 8 */\n        1\n    );\n}/* 9 */',
    'should support a bunch of block comments'
  )

  // Recast parses `4` as “dangling”:
  // <https://github.com/benjamn/recast/blob/dd7c5ec/lib/comments.ts#L255-L256>
  // But apprently doesn’t serialize it?
  t.equal(
    recast.print(
      attachComments(...parse('/* 1 */ a /* 2 */ = /* 3 */ { /* 4 */ }'))
    ).code,
    '/* 1 */\na = /* 2 */\n/* 3 */\n{};',
    'should support some more comments'
  )

  t.equal(
    recast.print(
      attachComments(
        ...parse(
          '// 1\nfunction // 2\na // 3\n(// 4\nb) // 5\n { // 6\n return b + // 7\n 1 // 8\n }'
        )
      )
    ).code,
    '// 1\nfunction // 2\na(\n    // 3\n    // 4\n    b\n) // 5\n{\n    // 6\n    return b + // 7\n    1;\n}// 8',
    'should support a bunch of line comments'
  )

  /** @type {EstreeComment[]} */
  var comments = []
  /** @type {EstreeProgram} */
  // @ts-ignore
  var tree = acornParse('/* 1 */ a /* 2 */ + /* 3 */ 1', {
    ecmaVersion: 2020,
    // @ts-ignore
    onComment: comments
  })

  removePositions(tree)

  t.equal(
    recast.print(attachComments(tree, comments)).code,
    'a + 1;',
    'should not fail on a tree w/o positional info'
  )

  comments = []
  // @ts-ignore
  tree = acornParse('1 + 1', {
    ecmaVersion: 2020,
    // @ts-ignore
    onComment: comments
  })

  t.equal(
    recast.print(attachComments(tree)).code,
    '1 + 1;',
    'should not fail w/o comments'
  )

  comments = []
  /** @type {EstreeProgram} */
  // @ts-ignore
  tree = acornParse('/* 1 */ a /* 2 */ + /* 3 */ 1', {
    ecmaVersion: 2020,
    // @ts-ignore
    onComment: comments
  })

  removePositions(comments)

  t.equal(
    recast.print(attachComments(tree, comments)).code,
    'a + 1;',
    'should not fail on comments w/o positional info'
  )

  comments = []
  // @ts-ignore
  tree = acornParse('/* 1 */ a /* 2 */ + /* 3 */ 1', {
    ecmaVersion: 2020,
    ranges: true,
    // @ts-ignore
    onComment: comments
  })

  removePositions(tree)

  t.equal(
    recast.print(attachComments(tree, comments)).code,
    '/* 1 */\na + /* 2 */\n/* 3 */\n1;',
    'should use `range`s'
  )

  comments = []
  // @ts-ignore
  tree = acornParse('/* 1 */ a /* 2 */ + /* 3 */ 1', {
    ecmaVersion: 2020,
    locations: true,
    // @ts-ignore
    onComment: comments
  })

  removePositions(tree)

  t.equal(
    recast.print(attachComments(tree, comments)).code,
    '/* 1 */\na + /* 2 */\n/* 3 */\n1;',
    'should use `loc`s'
  )

  t.end()
})

/**
 * @param {string} doc
 * @returns {[EstreeProgram, EstreeComment[]]}
 */
function parse(doc) {
  /** @type {EstreeComment[]} */
  var comments = []
  /** @type {EstreeProgram} */
  // @ts-ignore
  var tree = acornParse(doc, {ecmaVersion: 2020, onComment: comments})
  return [tree, comments]
}

/**
 * @param {EstreeNode|EstreeNode[]} value
 * @returns {void}
 */
function removePositions(value) {
  // @ts-ignore
  visit(
    value,
    /**
     * @param {EstreeNode} node
     */
    function (node) {
      // @ts-ignore they most certainly exist.
      delete node.start
      // @ts-ignore they most certainly exist.
      delete node.end
    }
  )
}
