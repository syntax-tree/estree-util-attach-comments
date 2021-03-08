'use strict'

module.exports = attachComments

var push = [].push

function attachComments(tree, comments) {
  walk(tree, {
    comments:
      comments === null || comments === undefined
        ? []
        : comments.concat().sort(compare),
    index: 0
  })
  return tree
}

function walk(node, state) {
  var children = []
  var comments = []
  var key
  var value
  var index

  // Done, we can quit.
  if (state.index === state.comments.length) {
    return
  }

  // Find all children of `node`
  for (key in node) {
    value = node[key]

    // Ignore comments.
    if (value && typeof value === 'object' && key !== 'comments') {
      if (typeof value.type === 'string') {
        children.push(value)
      } else if (Array.isArray(value)) {
        index = -1

        while (++index < value.length) {
          if (value[index] && typeof value[index].type === 'string') {
            children.push(value[index])
          }
        }
      }
    }
  }

  // Sort the children.
  children.sort(compare)

  // Initial comments.
  push.apply(
    comments,
    slice(state, node, false, {leading: true, trailing: false})
  )

  index = -1

  while (++index < children.length) {
    walk(children[index], state)
  }

  // Dangling or trailing comments.
  push.apply(
    comments,
    slice(state, node, true, {
      leading: false,
      trailing: Boolean(children.length)
    })
  )

  if (comments.length) {
    node.comments = comments
  }
}

function slice(state, node, compareEnd, fields) {
  var result = []

  while (
    state.comments[state.index] &&
    compare(state.comments[state.index], node, compareEnd) < 1
  ) {
    result.push(Object.assign({}, state.comments[state.index++], fields))
  }

  return result
}

function compare(left, right, compareEnd) {
  var field = compareEnd ? 'end' : 'start'

  // Offsets.
  if (left.range && right.range) {
    return left.range[0] - right.range[compareEnd ? 1 : 0]
  }

  // Points.
  if (left.loc && left.loc.start && right.loc && right.loc[field]) {
    return (
      left.loc.start.line - right.loc[field].line ||
      left.loc.start.column - right.loc[field].column
    )
  }

  // Just `start` (and `end`) on nodes.
  // Default in most parsers.
  if ('start' in left && field in right) {
    return left.start - right[field]
  }

  return NaN
}
