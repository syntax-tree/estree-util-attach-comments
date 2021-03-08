'use strict'

var test = require('tape')
var acorn = require('acorn')
var recast = require('recast')
var walk = require('estree-walker').walk
var attachComments = require('.')

test('estree-attach-comments (recast)', function (t) {
  t.equal(
    recast.print(attachComments(acorn.parse('', {ecmaVersion: 2020}), null))
      .code,
    '',
    'should support null comments'
  )

  t.equal(
    recast.print(
      attachComments(acorn.parse('', {ecmaVersion: 2020}), undefined)
    ).code,
    '',
    'should support undefined comments'
  )

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

  var comments = []
  var tree = acorn.parse('/* 1 */ a /* 2 */ + /* 3 */ 1', {
    ecmaVersion: 2020,
    onComment: comments
  })

  removePositions(tree)

  t.equal(
    recast.print(attachComments(tree, comments)).code,
    'a + 1;',
    'should not fail on a tree w/o positional info'
  )

  comments = []
  tree = acorn.parse('/* 1 */ a /* 2 */ + /* 3 */ 1', {
    ecmaVersion: 2020,
    onComment: comments
  })

  removePositions(comments)

  t.equal(
    recast.print(attachComments(tree, comments)).code,
    'a + 1;',
    'should not fail on comments w/o positional info'
  )

  comments = []
  tree = acorn.parse('/* 1 */ a /* 2 */ + /* 3 */ 1', {
    ecmaVersion: 2020,
    ranges: true,
    onComment: comments
  })

  removePositions(tree)

  t.equal(
    recast.print(attachComments(tree, comments)).code,
    '/* 1 */\na + /* 2 */\n/* 3 */\n1;',
    'should use `range`s'
  )

  comments = []
  tree = acorn.parse('/* 1 */ a /* 2 */ + /* 3 */ 1', {
    ecmaVersion: 2020,
    locations: true,
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

function parse(doc) {
  var comments = []
  var tree = acorn.parse(doc, {ecmaVersion: 2020, onComment: comments})
  return [tree, comments]
}

function removePositions(value) {
  walk(value, {
    enter: function (node) {
      delete node.start
      delete node.end
    }
  })
}
