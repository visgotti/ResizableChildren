# resizable-children
```vue
    <ResizableChildren direction="row"
        @lengths="lengthUpdates => (console.log(...lengthUpdates)/* Array< { index: number, oldLength: number, newLength: number }> */)"
        @drag-start="event => (console.log(...event))"
        @drag-end=""//same event as drag-start
    >
        <div :start-percent="40"> 
            EXPLICIT START-PERCENT SLOT, has start-percent attribute with value of 40, since direction is row, the width of this slot will be 40% of the parent. (height for column)
        </div>
        <div> 
            NON EXPLICIT START-PERCENT SLOT- no start-percent attribute, will use remaining/ # non explicit start-percent slots (30%)
         </div>
        <div>
            NON EXPLICIT START-PERCENT SLOT- no start-percent attribute, will use remaining/ # non explicit start-percent slots (30%)
         </div>
    </ResizableChildren>
```

```ts
type DragEvent = {
    index: number, 
    item1: { slot: Slot, wrapperRef: HTMLElement, slotElement: HTMLElement, slotIndex: number },
    item2:  { slot: Slot, wrapperRef: HTMLElement, slotElement: HTMLElement, slotIndex: number },
}
```

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
cd example && npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

