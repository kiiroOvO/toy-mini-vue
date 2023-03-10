import { describe, expect, it } from 'vitest'
import { effect } from '../src/effect'
import { reactive } from '../src/reactive'
import { isRef, proxyRefs, ref, unRef } from '../src/ref'

describe('ref', () => {
  it('', () => {
    const a = ref(1)
    expect(a.value).toBe(1)
  })
  it('reactive', () => {
    const a = ref(1)
    let result
    let calls = 0
    effect(() => {
      calls++
      result = a.value
    })
    expect(calls).toBe(1)
    expect(result).toBe(1)
    a.value = 2
    expect(calls).toBe(2)
    expect(result).toBe(2)
  })
  it('nested reactive', () => {
    const val = ref({
      count: 1,
    })
    let result
    effect(() => {
      result = val.value.count
    })
    expect(result).toBe(1)
    val.value.count = 2
    expect(result).toBe(2)
  })
  it('isRef', () => {
    const a = ref(1)
    const user = reactive({
      foo: 1,
    })
    expect(isRef(a)).toBe(true)
    expect(isRef(1)).toBe(false)
    expect(isRef(user)).toBe(false)
  })

  it('unRef', () => {
    const a = ref(1)
    expect(unRef(a)).toBe(1)
    expect(unRef(1)).toBe(1)
  })

  it('proxyRefs', () => {
    const user = {
      age: ref(10),
      name: '1',
    }
    const proxyRef = proxyRefs(user)
    expect(user.age.value).toBe(10)
    expect(proxyRef.age).toBe(10)
    expect(proxyRef.name).toBe('1')

    proxyRef.age = 20
    expect(proxyRef.age).toBe(20)
    expect(user.age.value).toBe(20)

    proxyRef.age = ref(10)

    expect(proxyRef.age).toBe(10)
    expect(user.age.value).toBe(10)
  })
})
