import { describe, expect, test } from 'vitest'
import { generate } from '../generate'
import { baseParse } from '../parse'
import { transformExpression } from '../transforms'
import { transformElement } from '../transforms/transformElement'
import { transformText } from '../transforms/transformText'
import { transform } from '../transform'
describe('generate', () => {
  test('string', () => {
    const ast = baseParse('hi 1')
    transform(ast)
    const { code } = generate(ast)
    expect(code).toMatchInlineSnapshot(`
      "return function render(_ctx, _cache){
      return 'hi 1'
      }"
    `)
  })
  test('interpolation', () => {
    const ast = baseParse('{{message}}')
    transform(ast, {
      nodeTransforms: [ transformExpression ],
    })
    const { code } = generate(ast)
    expect(code).toMatchInlineSnapshot(`
      "const {displayString: _displayString} = Toy
      \\"return function render(_ctx, _cache){
      return _displayString(_ctx.message)
      }"
    `)
  })
  test('e', () => {
    const ast = baseParse('<div><p></p></div>')
    transform(ast, {
      nodeTransforms: [ transformElement ],
    })
    const code = generate(ast)
    expect(code).toMatchInlineSnapshot(`
      {
        "code": "const {createElementVNode: _createElementVNode} = Toy
      \\"return function render(_ctx, _cache){
      return _createElementVNode( 'div', null, _createElementVNode( 'p', null, null))
      }",
      }
    `)
  })
  test('element', () => {
    const ast = baseParse('<div>hi,{{message}}</div>')
    transform(ast, {
      nodeTransforms: [ transformExpression, transformElement, transformText ],
    })
    const { code } = generate(ast)
    expect(code).toMatchInlineSnapshot(`
      "const {displayString: _displayString, createElementVNode: _createElementVNode} = Toy
      \\"return function render(_ctx, _cache){
      return _createElementVNode( 'div', null, 'hi,' + _displayString(_ctx.message))
      }"
    `)
  })
})
