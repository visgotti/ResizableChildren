import Vue from 'vue';

export default Vue.component('render-slot', {
    props: {
        value: {type: [Object], required: true},
        tag: {type: String, default: 'div'},
        options: {
            type: Object, default: () => {
            }
        },
    },
    render: function (h) {
        let nodes = this.value;
        if (!Array.isArray(nodes)) {
            nodes = [nodes]
        }
        return h(this.tag, this.options, nodes)
    }
})