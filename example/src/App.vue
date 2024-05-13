<template>
  <div id="app">
    <div
      class="demo-section"
    >
        <ul>
            <li @click="() => { this.handleSwitchTo('row') }" :class="{'selected-dir': this.selectedDirection === 'row'}">row (persisted) </li>
            <li @click="() => { this.handleSwitchTo('column') }" :class="{'selected-dir': this.selectedDirection === 'column'}"> column (not persisted) </li>
        </ul>
      <h3>
          {{ this.selectedDirection}} with resizable children
      </h3>
      <ResizableChildren
          :persist="true"
          :persistId="'test-row'"
          v-if="this.selectedDirection === 'row'"
          :direction="'row'"
          :divider-length="'95%'"
          @lengths="handleLengthsChanged"
          @drag-start="handleDragStart"
          @drag-end="handleDragEnd"
      >
        <div
            :start-percent="50"
            :min-length="10"
        >
          <div> slot 1a </div>
          <div> slot 1b </div>
          <CustomComponent
            :start-percent="50"
            :test="testProp"
          />
        </div>
        <div
            :min-length="50"
            :start-percent="40"
        >
            slot 2
        </div>
        <CustomComponent
          :test="testProp"
        />
      </ResizableChildren>
    <ResizableChildren
        :persist="true"
        :persistId="'test-column'"
        v-else-if="this.selectedDirection==='column'"
        :direction="'column'"
        :divider-length="'95%'"
        @lengths="handleLengthsChanged"
        @drag-start="handleDragStart"
        @drag-end="handleDragEnd"
        :minLength="50"
    >
            <div>
                <div> slot 1a </div>
                <div> slot 1b </div>
            </div>
            <div> slot 2 </div>
            <div> slot 3 </div>
            <div> slot 4 </div>
    </ResizableChildren>
    </div>
  </div>
</template>

<script>
import ResizableChildren from '../../dist';
import CustomComponent from './CustomComponent.vue'
export default {
  name: 'App',
  data() {
    return {
        testProp: 'test prop start',
        selectedDirection: 'row'
    }
  },
  methods: {
      handleLengthsChanged(v) {
          console.log('lengths changed:', v)
      },
      handleDragEnd(e) {
        console.log('end', e);
      },
      handleDragStart(e) {
        console.log('start', e);
      },

      handleSwitchTo(dir) {
          if(dir === this.selectedDirection) return;
          // im not sure why... but if i just set the direction to something else it doesnt hit the mounted/destroy hooks on the component.
          this.selectedDirection = null;
          this.$nextTick(() => {
              this.selectedDirection = dir;
          })
      }
  },
  mounted() {
    setTimeout(() => {
      this.testProp = "test prop changed";
    }, 1000);
  },
  components: {
    CustomComponent,
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
