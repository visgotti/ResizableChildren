<template>
  <div id="app">
    <
      class="demo-section"
    >
        <ul>
            <li @click="() => { this.handleSwitchTo('row') }" :class="{'selected-dir': this.selectedDirection === 'row'}">row </li>
            <li @click="() => { this.handleSwitchTo('column') }" :class="{'selected-dir': this.selectedDirection === 'column'}"> column </li>
        </ul>
      <h3>
          {{ selectedDirection}} with resizable children
      </h3>
      <ResizableChildren
          v-if="selectedDirection"
          :direction="selectedDirection"
          :divider-length="'95%'"
          @lengths="handleLengthsChanged"
      >
        <div :start-percent="50">
          <div> slot 1a </div>
          <div> slot 1b </div>
        </div>
        <div :start-percent="40">
            slot 2
        </div>
        <div> slot 4 </div>
      </ResizableChildren>

        <Droppy
            title="Animations"
            @toggle="(e) => { log('toggled:' + e) }"
        >
            <Droppy v-for="dropitem in dropsitems"
            />
            </Droppy>
        </Droppy>

    </div>
  </div>
</template>

<script>
import ResizableChildren from '../src/components/resizable-children.vue'

export default {
  name: 'App',
    data() {
      return {
          selectedDirection: 'row'
      }
    },
    methods: {
        handleLengthsChanged(v) {
            console.log('lengths changed:', v)
        },
        handleSwitchTo(dir) {
            this.selectedDirection = dir;

            /*
            if(dir === this.selectedDirection) return;
            // im not sure why... but if i just set the direction to something else it doesnt hit the mounted/destroy hooks on the component.
            this.selectedDirection = null;
            this.$nextTick(() => {
                this.selectedDirection = dir;
            })
             */
        }
    },
  components: {
    ResizableChildren
  }
}
</script>

<style>
    body, html {
        display: inline-block;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
    }
    #app {
        font-family: Avenir, Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-align: center;
        color: #2c3e50;
        height: 100%;
        width: 100%;
    }
    li {
        cursor: pointer
    }
    li:hover {
        background-color: darkgray;
    }
    .selected-dir {
        background-color: dimgray;
    }
    .demo-section {
        display: flex;
        flex-direction: column;
        width: 100%;
        min-width: 100%;
        max-width: 100%;

        height: 100%;
        min-height: 100%;
        max-height: 100%;
  }
</style>
