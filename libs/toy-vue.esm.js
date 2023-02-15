const targetMap = new WeakMap();
let activeEffect;
let shouldTrack;
function track(target, key) {
    if (!isTracking())
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
function trigger(target, key) {
    let depsMap = targetMap.get(target);
    if (!depsMap)
        return;
    let dep = depsMap === null || depsMap === void 0 ? void 0 : depsMap.get(key);
    if (!dep)
        return;
    triggerEffects(dep);
}
function triggerEffects(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.active = true;
        this._fn = fn;
        this.scheduler = scheduler;
        this.deps = [];
    }
    run() {
        if (!this.active) {
            return this._fn();
        }
        // ++ => get and set
        shouldTrack = true;
        //
        activeEffect = this;
        const result = this._fn();
        shouldTrack = false;
        return result;
    }
    stop() {
        if (this.active) {
            cleanupEffect(this);
            this.onStop && this.onStop();
            this.active = false;
        }
    }
}
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
function trackEffects(dep) {
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
function stop(runner) {
    var _a;
    if (!runner.effect)
        return;
    (_a = runner.effect) === null || _a === void 0 ? void 0 : _a.stop();
}
function effect(fn, options = {}) {
    const { scheduler } = options;
    const _effect = new ReactiveEffect(fn, scheduler);
    Object.assign(_effect, options);
    // run called when init
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}

const isObject = (val) => val !== null && typeof val === 'object';
const hasChanged = (val, newVal) => !Object.is(val, newVal);
const isString = (val) => typeof val === 'string';
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
const toHandlerKey = (str) => (str ? 'on' + capitalize(str) : '');
const isStartWithOn = (key) => /^on[A-Za-z]/.test(key);
const camelize = (str) => str.replace(/-(\w)/g, (_, c) => {
    return c ? c.toUpperCase() : '';
});
const isEmptyObject = (obj) => JSON.parse(JSON.stringify(obj)) === '{}';
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = ((u + v) / 2) | 0;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

// created once
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadonly = false, isShallow = false) {
    return function get(target, key) {
        if (key === "__is_reactive__" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__is_readonly__" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        const res = Reflect.get(target, key);
        if (isShallow) {
            return res;
        }
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        if (!isReadonly) {
            track(target, key);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        trigger(target, key);
        return res;
    };
}
const mutableHandlers = {
    get,
    set,
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn(`key: ${key.toString()} set fail,${target} readonly`);
        return true;
    },
};
const shallowReadonlyHandlers = Object.assign({}, readonlyHandlers, {
    get: shallowReadonlyGet,
});

function reactive(raw) {
    return createReactiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createReactiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createReactiveObject(raw, shallowReadonlyHandlers);
}
function createReactiveObject(target, baseHandlers) {
    if (!isObject(target)) {
        console.warn(`${target} must be a object`);
        return;
    }
    return new Proxy(target, baseHandlers);
}
function isReactive(value) {
    return !!value["__is_reactive__" /* ReactiveFlags.IS_REACTIVE */];
}
function isReadonly(value) {
    return !!value["__is_readonly__" /* ReactiveFlags.IS_READONLY */];
}
function isProxy(value) {
    return isReactive(value) || isReadonly(value);
}

class ComputedIMpl {
    constructor(getter) {
        this._getter = getter;
        this._dirty = true;
        this._effect = new ReactiveEffect(getter, () => {
            if (!this._dirty) {
                this._dirty = true;
            }
        });
    }
    get value() {
        if (this._dirty) {
            this._dirty = false;
            this._value = this._effect.run();
        }
        return this._value;
    }
}
function computed(getter) {
    return new ComputedIMpl(getter);
}

class RefImpl {
    constructor(value) {
        this._rawValue = value;
        this._value = convertToReactive(value);
        this.dep = new Set();
        this.__is_ref = true;
    }
    get value() {
        if (isTracking()) {
            trackEffects(this.dep);
        }
        return this._value;
    }
    set value(newValue) {
        if (hasChanged(this._rawValue, newValue)) {
            this._rawValue = newValue;
            this._value = convertToReactive(newValue);
            triggerEffects(this.dep);
        }
    }
}
function convertToReactive(value) {
    return isObject(value) ? reactive(value) : value;
}
function ref(value) {
    return new RefImpl(value);
}
function isRef(value) {
    return !!(value && value.__is_ref);
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(ref) {
    return new Proxy(ref, {
        get(target, key, receiver) {
            return unRef(Reflect.get(target, key, receiver));
        },
        set(target, key, newValue, receiver) {
            if (isRef(target[key]) && !isRef(newValue)) {
                target[key].value = newValue;
                return true;
            }
            else {
                return Reflect.set(target, key, newValue, receiver);
            }
        },
    });
}

function emit(instance, event, ...args) {
    const { props } = instance;
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    handler && handler(...args);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    $el: (instance) => instance.vnode.el,
    $state: (instance) => instance.setupState,
    $slots: (instance) => instance.slots,
    $props: (instance) => instance.props,
};
const publicInstanceProxyHandler = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        const getter = publicPropertiesMap[key];
        if (getter) {
            return getter(instance);
        }
    },
};

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode, parent) {
    const instance = {
        vnode,
        parent,
        type: vnode.type,
        render: () => null,
        props: {},
        setupState: {},
        emit: () => { },
        slots: {},
        provides: parent ? parent.provides : {},
        isMounted: false,
        update: () => { },
    };
    instance.emit = emit.bind(null, instance);
    return instance;
}
function setupComponent(instance) {
    initProxy(instance);
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function initProxy(instance) {
    instance.proxy = new Proxy({
        _: instance,
    }, publicInstanceProxyHandler);
}
function setupStatefulComponent(instance) {
    const Component = instance.type;
    const { setup } = Component;
    if (setup) {
        // fn or object
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    // setup return object or function
    if (isObject(setupResult)) {
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    if (Component.render) {
        instance.render = Component.render;
    }
}
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

const queue = [];
let isFLush = false;
function nextTick(fn) {
    return fn ? Promise.resolve().then(fn) : Promise.resolve();
}
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
function queueFlush() {
    if (isFLush)
        return;
    isFLush = true;
    Promise.resolve().then(() => {
        isFLush = false;
        let job;
        while ((job = queue.shift())) {
            job && job();
        }
    });
}

const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
function createRender(options) {
    const { createElement, patchProp, insert, setText, remove } = options;
    function render(vnode, container, parentComponent) {
        // init
        patch(null, vnode, container, parentComponent);
    }
    function patch(n1, n2, container, parentComponent, anchor) {
        const { type, shapeFlag } = n2;
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent);
                }
                break;
        }
    }
    function processComponent(n1, n2, container, parentComponent) {
        // stateful component
        if (!n1) {
            mountComponent(n2, container, parentComponent);
        }
        else {
            patchComponent(n1, n2);
        }
    }
    function patchComponent(n1, n2) {
        const instance = (n2.instance = n1.instance);
        if (shouldPatchComponent(n1, n2)) {
            instance.next = n2;
            instance.update();
        }
        else {
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    function shouldPatchComponent(n1, n2) {
        const { props: prevProps } = n1;
        const { props: nextProps } = n2;
        for (const key in nextProps) {
            if (nextProps[key] !== prevProps[key]) {
                return true;
            }
        }
        return false;
    }
    function mountComponent(vnode, container, parentComponent) {
        const instance = (vnode.instance = createComponentInstance(vnode, parentComponent));
        setupComponent(instance);
        setupRenderEffect(instance, vnode, container);
    }
    function setupRenderEffect(instance, initialVNode, container) {
        instance.update = effect(() => {
            if (!instance.isMounted) {
                const { proxy } = instance;
                const subTree = (instance.subTree = instance.render.call(proxy));
                // 子组件patch
                patch(null, subTree, container, instance);
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                // update
                const { proxy, next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    patchComponentPreRender(instance, next);
                }
                const subTree = instance.render.call(proxy);
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance);
            }
        }, {
            scheduler() {
                queueJobs(instance.update);
            },
        });
    }
    function patchComponentPreRender(instance, next) {
        // 更新之前
        instance.vnode = next;
        instance.props = next.props;
        instance.next = null;
    }
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function mountElement(vnode, container, parentComponent, anchor) {
        const el = (vnode.el = createElement(vnode.type));
        const { children, shapeFlag, props } = vnode;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            setText(el, children);
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(children, el, parentComponent);
        }
        for (const key in props) {
            patchProp(el, key, null, props[key]);
        }
        insert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach((v) => {
            patch(null, v, container, parentComponent, anchor);
        });
    }
    function processFragment(n1, n2, container, parentComponent) {
        mountChildren(n2.children, container, parentComponent);
    }
    function processText(n1, n2, container) {
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        insert(textNode, container);
    }
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const prevShapeFlag = n1.shapeFlag;
        const nextShapeFlag = n2.shapeFlag;
        const prevChildren = n1.children;
        const nextChildren = n2.children;
        const prevEl = n1.el;
        if (nextShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            // text/array -> text
            if (prevShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                // 清空旧的children
                unmountChildren(n1.children);
            }
            if (prevChildren !== nextChildren) {
                setText(prevEl, nextChildren);
            }
        }
        else if (nextShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            // text/array -> array
            if (prevShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                setText(prevEl, '');
                mountChildren(nextChildren, prevEl, parentComponent, anchor);
            }
            else {
                // array -> array
                patchKeyChildren(prevChildren, nextChildren, container, parentComponent);
            }
        }
    }
    function patchKeyChildren(prevChildren, nextChildren, container, parentComponent) {
        let i = 0;
        let prevLength = prevChildren.length - 1;
        let nextLength = nextChildren.length - 1;
        let prevRightIndex = prevLength;
        let nextRightIndex = nextLength;
        function isSameVnodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
        // left
        while (i <= prevRightIndex && i <= nextRightIndex) {
            const n1 = prevChildren[i];
            const n2 = nextChildren[i];
            if (isSameVnodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent);
            }
            else {
                break;
            }
            i++;
        }
        // right
        while (i <= prevRightIndex && i <= nextRightIndex) {
            const n1 = prevChildren[prevRightIndex];
            const n2 = nextChildren[nextRightIndex];
            if (isSameVnodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent);
            }
            else {
                break;
            }
            prevRightIndex--;
            nextRightIndex--;
        }
        // new vnode list > old vnode list
        if (i > prevRightIndex) {
            if (i <= nextRightIndex) {
                const nextPos = nextRightIndex + 1;
                const anchor = nextPos < nextLength ? nextChildren[nextPos].el : null;
                while (i <= nextRightIndex) {
                    patch(null, nextChildren[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i > nextRightIndex) {
            // old vnode list > new vnode list
            while (i <= prevRightIndex) {
                remove(prevChildren[i].el);
                i++;
            }
        }
        else {
            // 中间
            let prevLeftIndex = i;
            let nextLeftIndex = i;
            let moved = false;
            // [4,3,1]
            // 当遍历到 1 时就可以确定后面的都需要移动
            // move true
            let maxIndex = 0;
            const nextIndexMap = new Map();
            const needPatch = nextRightIndex - nextLeftIndex + 1;
            let patched = 0;
            const nextIndexInPrevIndexMap = new Array(needPatch).fill(-1);
            for (let i = nextLeftIndex; i <= nextRightIndex; i++) {
                const nextChild = nextChildren[i];
                nextIndexMap.set(nextChild.key, i);
            }
            for (let i = prevLeftIndex; i <= prevRightIndex; i++) {
                const prevChild = prevChildren[i];
                if (patched >= needPatch) {
                    remove(prevChild.el);
                    continue;
                }
                let nextIndex;
                if (!prevChild.key) {
                    nextIndex = nextIndexMap.get(prevChild.key);
                }
                else {
                    for (let j = nextLeftIndex; j <= nextRightIndex; j++) {
                        const nextChild = nextChildren[j];
                        if (isSameVnodeType(prevChild, nextChild)) {
                            nextIndex = j;
                            break;
                        }
                    }
                }
                if (!nextIndex) {
                    remove(prevChild.el);
                }
                else {
                    // index -> new position
                    // value -> prev position
                    if (nextIndex > maxIndex) {
                        maxIndex = nextIndex;
                    }
                    else {
                        moved = true;
                    }
                    nextIndexInPrevIndexMap[nextIndex - nextLeftIndex] = i + 1;
                    patch(prevChild, nextChildren[nextIndex], container, parentComponent);
                    patched++;
                }
            }
            const sequence = moved ? getSequence(nextIndexInPrevIndexMap) : [];
            // 倒叙
            let sequenceIndex = sequence.length - 1;
            for (let i = needPatch - 1; i >= 0; i--) {
                const nextPos = i + nextLeftIndex;
                const nextChild = nextChildren[nextPos];
                const anchor = nextPos + 1 < nextLength ? nextChildren[nextPos + 1].el : null;
                if (nextIndexInPrevIndexMap[i] === -1) {
                    // === -1 create new node
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    if (sequenceIndex < 0 || i !== sequence[sequenceIndex]) {
                        // 这时候的真实 Dom 还是 prevChild
                        console.log('need move');
                        insert(nextChild.el, container, anchor);
                    }
                    else {
                        sequenceIndex--;
                    }
                }
            }
        }
    }
    function unmountChildren(children) {
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el;
            remove(el);
        }
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        // updateElement
        const oldProps = n1.props || {};
        const newProps = n2.props || {};
        const el = (n2.el = n1.el);
        patchChildren(n1, n2, el, parentComponent, anchor);
        patchProps(el, oldProps, newProps);
    }
    function patchProps(el, oldProps, newProps) {
        if (oldProps !== newProps) {
            for (const key in newProps) {
                //
                const prevProp = oldProps[key];
                const newProp = newProps[key];
                if (prevProp !== newProp) {
                    patchProp(el, key, prevProp, newProp);
                }
            }
        }
        if (!isEmptyObject(oldProps)) {
            // remove oldProp
            for (const key in oldProps) {
                if (!(key in newProps)) {
                    patchProp(el, key, oldProps[key], null);
                }
            }
        }
    }
    return { createApp: createAppApi(render) };
}

function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        el: null,
        shapeFlag: getShapeFlag(type),
        instance: null,
        key: props && props.key,
    };
    if (isString(children)) {
        vnode.shapeFlag = vnode.shapeFlag | 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag = vnode.shapeFlag | 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof children === 'object') {
            // named slot
            vnode.shapeFlag = vnode.shapeFlag | 16 /* ShapeFlags.SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}
function getShapeFlag(type) {
    return typeof type === 'string'
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

function createAppApi(render) {
    return function createApp(root) {
        return {
            mount(rootContainer) {
                const vnode = createVNode(root);
                render(vnode, rootContainer, null);
            },
        };
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slots) {
        if (typeof slot === 'function') {
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

function provide(key, val) {
    var _a;
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = (_a = currentInstance.parent) === null || _a === void 0 ? void 0 : _a.provides;
        if (provides === parentProvides) {
            // the provides will create a new provides if true,and let the prototype to parentProvides
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = val;
    }
}
function inject(key, defaultVal) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const { parent } = currentInstance;
        const parentProvides = parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultVal) {
            return defaultVal;
        }
    }
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, value, nextVal) {
    if (isStartWithOn(key)) {
        const event = key.slice(2).toLocaleLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(el, parent, anchor) {
    parent.insertBefore(el, anchor || null);
}
function remove(el) {
    const parent = el.parentNode;
    if (parent) {
        parent.removeChild(el);
    }
}
function setText(el, text) {
    el.textContent = text;
}
const renderer = createRender({
    createElement,
    patchProp,
    insert,
    setText,
    remove,
});
function createApp(root) {
    return renderer.createApp(root);
}

export { Fragment, ReactiveEffect, Text, computed, convertToReactive, createApp, createAppApi, createComponentInstance, createRender, createTextVNode, createVNode, effect, getCurrentInstance, h, initProxy, inject, isProxy, isReactive, isReadonly, isRef, isTracking, nextTick, provide, proxyRefs, queueJobs, reactive, readonly, ref, renderSlots, renderer, setCurrentInstance, setupComponent, shallowReadonly, stop, track, trackEffects, trigger, triggerEffects, unRef };
