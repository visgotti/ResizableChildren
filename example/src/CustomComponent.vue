<template>
    <div id="app">
        name: {{ test  }}
    </div>
</template>

<script>
    export default {
        props: {
            test: {
                type: String,
                default: "default"
            }
        }
    }
</script>