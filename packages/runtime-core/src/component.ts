import { isObject } from '@toy-vue/utils'
import {
  FunctionWithEffect,
  proxyRefs,
  shallowReadonly,
} from '@toy-vue/reactivity'
import { Emit, emit } from './componentEmit'
import { initProps } from './componentProps'
import { publicInstanceProxyHandler } from './ComponentPublicInstance'
import { initSlots } from './componentSlots'
import { AnyObject, Component, Render, Slots, VNode, VNodeProps } from './vnode'

export type ComponentInstance<Node = AnyObject> = {
  vnode: VNode<Node>
  next?: VNode<Node>
  type: Component
  parent: ComponentInstance
  setupState?: AnyObject
  provides?: AnyObject
  proxy?: AnyObject
  props?: VNodeProps
  emit?: Emit
  subTree?: VNode<Node>
  slots?: Slots
  isMounted: boolean
  render: Render
  update?: FunctionWithEffect
  instance?: ComponentInstance
}

let compiler:Function

export function createComponentInstance<Node = AnyObject>(
  vnode: VNode<Node>,
  parent?: ComponentInstance,
): ComponentInstance<Node> {
  const instance: ComponentInstance<Node> = {
    vnode,
    parent,
    type: <Component>vnode.type,
    render: () => null,
    props: {},
    setupState: {},
    emit: () => {},
    slots: {},
    provides: parent ? parent.provides : {},
    isMounted: false,
    update: () => {},
  }
  instance.emit = emit.bind(null, instance)

  return instance
}

export function setupComponent(instance: ComponentInstance) {
  initProxy(instance)
  initProps(instance, instance.vnode.props)
  initSlots(instance, instance.vnode.children)

  setupStatefulComponent(instance)
}
export function initProxy(instance: ComponentInstance) {
  instance.proxy = new Proxy(
    {
      _: instance,
    },
    publicInstanceProxyHandler,
  )
}
function setupStatefulComponent(instance: ComponentInstance) {
  const Component = instance.type
  const { setup } = Component

  if (setup) {
    // fn or object
    setCurrentInstance(instance)
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    })

    setCurrentInstance(null)

    handleSetupResult(instance, setupResult)
  }
}

function handleSetupResult(instance: ComponentInstance, setupResult: any) {
  // setup return object or function
  if (isObject(setupResult)) { instance.setupState = proxyRefs(setupResult) }

  finishComponentSetup(instance)
}

function finishComponentSetup(instance: ComponentInstance) {
  const Component = instance.type as Component

  if (compiler && !Component.render) {
    if (Component.template) { Component.render = compiler(Component.template) }
  }
  instance.render = Component.render
}

let currentInstance: ComponentInstance = null

export function getCurrentInstance() {
  return currentInstance
}
export function setCurrentInstance(instance: ComponentInstance) {
  currentInstance = instance
}

export function registerRuntimeCompiler(_compiler:Function) {
  compiler = _compiler
}
