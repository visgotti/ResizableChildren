import { defineComponent, h } from 'vue';

export default defineComponent({
    name: 'render-slot',
    render() {
        let nodes = this.value;
        if (!Array.isArray(nodes)) {
            nodes = [nodes]
        }
        return h(this.tag, this.options, nodes)
    },
    props: {
        value: {type: [Object], required: true},
        tag: {type: String, default: 'div'},
        options: {
            type: Object, default: () => {
            }
        },
    },
})