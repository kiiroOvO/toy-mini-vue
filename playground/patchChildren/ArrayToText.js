import { ref, h } from "../../libs/toy-vue.esm";
const nextChildren = "newChildren";
const prevChildren = [h("div", {key:"A"}, "A"), h("div", {key:"B"}, "B")];

const test = ['a','b'];
export const ArrayToText = {

  name: "ArrayToText",
  setup() {
    const isChange = ref(false);
    window.isChange = isChange;
    return {
      isChange,
    };
  },
  render() {
    const self = this;
    return h('div',{},
      "asd"
    )
    return self.isChange === true
      ? h("div", {}, nextChildren)
      : h("div", {key:"prev"}, prevChildren);
  },
};
