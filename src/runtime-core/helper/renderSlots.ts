import { Fragment } from '../renderer'
import { Children, Slots, VNode, createVNode } from '../vnode'

export function renderSlots(slots: Slots, name: string, props: any) {
  const slot = slots[name]
  if (slots) {
    if (typeof slot === 'function')
      return createVNode(Fragment, {}, slot(props))
  }
}
