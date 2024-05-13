<template>
    <div :class="outerWrapperClass"
         :ref="'outer'"
         :style="{
             ...outerStyleObject
         }"
    >
        <div
            class="slot-wrapper --resizable-child-slot-wrapper"
            v-for="(slot, i) in slots"
            :key="`slot-wrapper-${i}`"
            :style="lengthsPerSection[i] && lengthsPerSection[i].style"
            :ref="`section${i}`"
        >
            <render-slot :value="slot"
                :style="innerStyleObjects[i]"
            />
            <div v-if="i < slots.length-1"
                  class="section-divider"
                  :style="{
                    ...dividerStyleObject,
                    ...dividerOffsetStyle
                  }"
            >
                <div
                        class="section-divider-handle"
                        :class="dividerClass"
                        @pointerdown="(e) => handleDragStart(e, i)"
                        :style="dividerHandleStyleObject"
                >
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import renderSlot from "./renderSlot.js";
    import { 
        capitalize,
        isPixelValue, 
        pixelValidator,
        localStorageSet,
        localStorageGet,
        roundFloat,
        addFloats,
        localStorageRemove
     } from "../utils";
    export default {
        name: 'ResizableChildren',
        components: {
            renderSlot,
        },
        created() {
            this.updateSectionLengthsFromParentResize = this.updateSectionLengthsFromParentResize.bind(this);
            this.slots = this.$slots.default();
            this.totalSections = this.slots.length;
            this.totalDividerLength = (this.totalSections-1) * parseInt(this.dividerThickness);
            this.dividerHandleOffset = `-${Math.floor((parseInt(this.dividerHandleThickness) - parseInt(this.dividerThickness)) / 2)}px`;
        },
        mounted() {
            if(this.useResizeIntervalCheck) {             
                const doCheck = () => {
                    const nwLeng = this.$refs.outer[this.dividerLengthKey];
                    if(nwLeng === this.lastParentLength) {
                        return;
                    }
                    
                    this.updateSectionLengthsFromParentResize(nwLeng);
                }
                this.$nextTick(() => {
                    doCheck();
                    this.resizeInterval = setInterval(() => {
                        doCheck();                        
                    }, this.intervalTimeout);
                });
            }
            this.handleDragEnd = this.handleDragEnd.bind(this);
            document.addEventListener('pointerup', this.handleDragEnd);
            this.handleDragSection = this.handleDragSection.bind(this);
        
            let restored = false;
            if(this.persist) {
                if(!this.persistId) {
                    throw new Error(`Needs unique id in persistId prop to persist`)
                }
                restored = this.initPersistedStartPercents();
            
            }
            if(!restored) {
                this.parseStartPercents();
            }
            this.setDefaultLengths();
            this.initializedLengths = true;
            this.dividerOffsetStyle = this.getDividerOffset();
        
            this.updateSectionLengthsFromParentResize(this.$refs.outer[this.dividerLengthKey]);
        },
        beforeUnmount() {
            this.initializedLengths = false;
            if(this.isDraggingIndex > 0) {
                this.isDraggingIndex = -1;
            }
            if(this.resizeInterval){
                clearInterval(this.resizeInterval);
                this.resizeInterval = null;
            }
            this.clearPersistDebounce();
            this.persistStartPercents();
            document.removeEventListener('pointerup', this.handleDragEnd);
        },
        props: {
            persist: {
                type: Boolean,
                default: false,
            },
            persistId: {
                type: String,
                default: '',
            },  
            direction: {
                type: String,
                required: true,
                validator: function(value) {
                    return ['column', 'row'].indexOf(value) !== -1
                }
            },
            dividerColor: {
                type: String,
                default: '#000000'
            },
            dividerThickness: {
                type: String,
                default: '4px',
                validator: pixelValidator
            },
            dividerHandleThickness: {
                type: String,
                default: '13px',
                validator: pixelValidator
            },
            dividerLength: {
                type: String,
                default: '100%',
                validator: pixelValidator
            },
            parentLength: {
                type: String,
                required: false,
                validator: pixelValidator
            },
            outerWidth: {
                type: String,
                required: false,
                validator: pixelValidator,
                default: '100%'
            },
            outerHeight: {
                type: String,
                required: false,
                validator: pixelValidator,
                default: '100%'
            },
            preventCursorStyle: {
                type: Boolean,
                required: false,
                default: false
            },
            useResizeIntervalCheck: {
                type: Boolean,
                default: true
            },
            minLength: {
                type: Number,
                default: 0,
            },
            intervalTimeout: {
                type: Number,
                default: 1000/30 // 30fps
            }
        },
        data() {
            return {
                debouncedPersistTimeout: null,
                resizeInterval: null,
                lastParentLength: 0,
                slots: [],
                initializedLengths: false,
                lastDragPosition: 0,
                isDraggingIndex: -1,
                lengthsPerSection: {},
                totalSections: 0,
                totalDividerLength: 0,
                dividerHandleOffset: 0,
                indexesBeforeCollapsed: {},
                indexesAfterCollapsed: {},
                dividerOffsetStyle: {['bottom']: '0px' },
                startPercents: {},
                utilizedStartPercent: 0,
            }
        },
        computed: {
            isRow() { return this.direction === 'row'; },
            bodyClass() { return `--resizable-${this.direction}-is-dragging` },
            beforeKey() { return this.isRow ? 'left' : 'top' },
            afterKey() { return this.isRow ? 'right' : 'bottom' },
            eventPosKey() { return this.isRow ? 'clientX' : 'clientY'; },
            lengthKey() { return this.isRow ? 'width' : 'height'; },
            lengthKeyUppercase() { return capitalize(this.lengthKey)},
            dividerLengthKey() { return `client${this.lengthKeyUppercase}`},
            minLengthKeys() {
                return [
                    'minLength',
                    'min-length',
                    `min-${this.lengthKey}`,
                    `min${this.lengthKeyUppercase}`
                ]
            },
            draggingItems() {
                return {
                    item1: this.getSlotDataAtIndex(this.isDraggingIndex),
                    item2: this.getSlotDataAtIndex(this.isDraggingIndex+1),
                }
            },
            dividerClass() {
                const className = `section-divider-handle--${this.direction}`;
                if(!this.preventCursorStyle) {
                   return `${className} is-dragging`;
                }
                return className;
             },
            outerWrapperClass() {
                let className = 'resizable-row-outer';
                if(this.isDraggingIndex > -1 && !this.preventCursorStyle) {
                    className = `${className} ${this.direction}-is-dragging`;
                }
                return className;
            },
            innerStyleObjects() {
                const obj = {};
                Object.keys(this.lengthsPerSection).forEach((k, i) => {
                    const value = this.lengthsPerSection[k][this.lengthKey];
                    const offsetForDivider = i !== this.totalSections ? parseInt(this.dividerThickness) : 0;
                    obj[k] = this.makeLengthStyleObject(this.lengthKey, value - offsetForDivider);
                });
                return obj;
            },
            dividerStyleObject() {
                const height = this.isRow ? this.dividerLength : this.dividerThickness;
                const width = this.isRow ? this.dividerThickness : this.dividerLength;
                return {
                    width,
                    minWidth: width,
                    maxWidth: width,
                    height,
                    minHeight: height,
                    maxHeight: height,
                    position: 'absolute',
                    bottom: '0px',
                    right: '0px',
                    backgroundColor: this.dividerColor,
                }
            },
            dividerHandleStyleObject() {
                const lineLengthKey = this.isRow ? 'height' : 'width';
                const offsetKey = this.isRow ? 'left' : 'top';
                return {
                    ...this.makeLengthStyleObject(this.lengthKey, this.dividerHandleThickness),
                    ...this.makeLengthStyleObject(lineLengthKey, this.dividerLength),
                    position: 'absolute',
                    [offsetKey]: this.dividerHandleOffset,
                }
            },
            outerStyleObject() {
                return {
                    display: 'flex',
                    flexDirection: this.direction,
                    overflow: 'hidden',
                    width: this.outerWidth,
                    height: this.outerHeight
                }
            }
        },
        watch: {
            persistId(newValue, oldValue) {
                if(oldValue) {
                    localStorageRemove(oldValue)
                }
                if(newValue) {
                    this.persistStartPercents();
                }
            },
            lengthsPerSection() {
                if(!this.persist) return;
                this.clearPersistDebounce();
                this.debouncedPersistTimeout = setTimeout(() => {
                    this.persistStartPercents();
                    this.debouncedPersistTimeout = null;
                }, 1000);
            },
            isDraggingIndex(newV, oldV) {
                let classListMethod = 'add';
                if(oldV < 0 && newV >= 0) {
                    document.addEventListener('pointermove', this.handleDragSection);
                } else if (oldV >= 0 && newV < 0) {
                    classListMethod = 'remove';
                    document.removeEventListener('pointermove', this.handleDragSection);
                }
                if(!this.preventCursorStyle) {
                    document.body.classList[classListMethod](this.bodyClass);
                }
            }
        },
        methods: {
            getSectionMinLength(sectionIndex) {
                return this.getSlotDataAttrProp(sectionIndex, this.minLengthKeys, this.minLength);
            },
            getSlotDataAttrProp(sectionIndex, propNameOrNames, defaultValue) {
                const propNames = Array.isArray(propNameOrNames) ? propNameOrNames : [propNameOrNames];
            
                const dataAttrs = this.slots?.[sectionIndex]?.props;
                if(!dataAttrs) {
                    return defaultValue;
                }
                for(let i = 0; i < propNames.length; i++) {
                    const prop = propNames[i];
                    if(!(prop in dataAttrs)) { continue; }
                    return dataAttrs[prop]
                }
                return defaultValue;
            },
            clearPersistDebounce() {
                if(!this.debouncedPersistTimeout) { return; }
                clearTimeout(this.debouncedPersistTimeout);
                this.debouncedPersistTimeout = null;
            },
            persistStartPercents() {
                if(!this.persist) {
                    return;
                }
                const percents = [];
                const outerLengthKey = this.isRow ? 'clientWidth' : 'clientHeight';
                Object.keys(this.lengthsPerSection).forEach((k, i) => {
                    const value = this.lengthsPerSection[k][this.lengthKey];
                    const percent = roundFloat(100 * (value/this.$refs.outer[outerLengthKey]), 1);
                    percents.push(percent);
                });
                let total = percents.reduce((a, b) => addFloats(a, b, 1), 0);
                let i = 0;
                const diff = roundFloat(Math.sign(100-total) * .1, 1);
                while(total !== 100) {
                    percents[i] = addFloats(percents[i], diff, 1);
                    total = addFloats(total, diff, 1)
                    i++;
                    if(i >= percents.length) {
                        i = 0;
                    }
                }
                localStorageSet(this.persistId, percents);
            },
            initPersistedStartPercents() {
                const p = localStorageGet(this.persistId);
                if(!p) return false;
        
                const startPercents = JSON.parse(p);
                if(startPercents.length !== this.slots.length) {
                    // invalid start percents
                    localStorageRemove(this.persistId);
                    return false;
                }
                this.utilizedStartPercent = 0;
                startPercents.forEach((p, i) => {
                    this.startPercents[i] = p;
                    this.utilizedStartPercent+=p;
                    if(this.utilizedStartPercent > 100) {
                            // invalid start percents
                        localStorageRemove(this.persistId);
                        return false;
                    }
                });
                return true;
            },
            getSlotDataAtIndex(slotIndex) {
                let itemRef = this.$refs[`section${slotIndex}`];
                if(Array.isArray(itemRef)) {
                    itemRef = itemRef[0];
                }
                return {
                    slotIndex,
                    slot: this.slots[slotIndex],
                    slotWrapperElement: itemRef,
                    slotElement: itemRef?.children?.[0],
                }
            },
            parseStartPercents() {
                this.utilizedStartPercent = 0;
                for(let i = 0; i < this.slots.length; i++) {
                    const startPercent = this.getSlotDataAttrProp(i, ['start-percent', 'startPercent'], null);
                    if(startPercent === null) { continue; }
                    if(isNaN(startPercent)) {
                        throw new Error(`Start percent needs to be a number value`)
                    }
                    if(startPercent < 0) {
                        throw new Error(`Start percent can not be less than 0.`)
                    }
                    this.startPercents[i] =startPercent;
                    this.utilizedStartPercent+=startPercent;
                    if(this.utilizedStartPercent > 100) {
                        throw new Error(`Total start percent can not go above 100.`)
                    }
                }
            },
            getDividerOffset() {
                let dividerLengthOffset = 0;
                let measurement = 'px';
                const offsetLengthKey = this.isRow ? 'clientHeight' : 'clientWidth';
                const dividerOffsetKey = this.isRow ? 'bottom' : 'right';
                if(this.$refs.outer) {
                    const intDividerLength = parseInt(this.dividerLength);
                    const totalLength = this.$refs.outer[offsetLengthKey];
                    if(isPixelValue(this.dividerLength)) {
                        dividerLengthOffset = (totalLength - intDividerLength)/2;
                    } else {
                        dividerLengthOffset = (100-intDividerLength)/2;
                        measurement = '%';
                    }
                }
                return { [dividerOffsetKey]: `${dividerLengthOffset}${measurement}` }
            },
            setDefaultLengths() {
                let newLengths = {};
                let evenLength = 0;
                if(this.$refs.outer) {
                    this.lastParentLength = this.$refs.outer[this.dividerLengthKey];
                    const utilizedStartPixels = this.lastParentLength * (this.utilizedStartPercent/100);
                    const totalLength = this.lastParentLength - utilizedStartPixels;
                    evenLength = Math.floor(totalLength/(this.totalSections-Object.keys(this.startPercents).length));
                }
                let utilized = 0;
                for(let i = 0; i < this.totalSections; i++) {
                    let lengthToUse = i in this.startPercents ? Math.floor(this.lastParentLength * (this.startPercents[i] / 100)) : evenLength;
                    utilized+=lengthToUse;
                    if(i === this.totalSections-1) {
                        if(this.lastParentLength-utilized > 0) {
                            //add remainder if were on last section and there's still length left to use from flooring the values.
                            lengthToUse+= this.lastParentLength-utilized;
                        }
                    }
                    newLengths[i] = {
                        [this.lengthKey]: lengthToUse,
                        style: this.makeLengthStyleObject(this.lengthKey,  lengthToUse)
                    }
                }
                this.lengthsPerSection = newLengths;
                const payload = Object.keys(this.lengthsPerSection).map(k => {
                    return {
                        index: k,
                        newLength: this.lengthsPerSection[k][this.lengthKey],
                        oldLength: 0,
                    }
                });
                this.$emit('lengths', payload);
            },
            getBeforeClientLengthOfSection(sectionIndex) {
                return parseInt(this.$refs[`section${sectionIndex}`][0].getBoundingClientRect()[this.dividerLengthKey])
            },
            getBeforePositionOfSection(sectionIndex) {
                return parseInt(this.$refs[`section${sectionIndex}`][0].getBoundingClientRect()[this.beforeKey])
            },
            getAfterPositionOfSection(sectionIndex) {
                return parseInt(this.$refs[`section${sectionIndex}`][0].getBoundingClientRect()[this.afterKey])
            },
            updateSectionLengthsFromParentResize(newParentLength) {
                const oldParentLength = this.lastParentLength;
                if(newParentLength === this.lastParentLength) {
                    return;
                }
                if(!this.initializedLengths) return false;
                this.lastParentLength = newParentLength;

                const updatedLengthsPerSection = {};
                const payload = [];
                let lastIndex = this.totalSections-1;

                const addUpdate = (lengthValue) => {
                    payload.push({
                        index: lastIndex,
                        oldLength: this.lengthsPerSection[lastIndex][this.lengthKey],
                        newLength: lengthValue,
                    });
                    updatedLengthsPerSection[lastIndex] = {
                        [this.lengthKey]: lengthValue,
                        style: this.makeLengthStyleObject(this.lengthKey, lengthValue)
                    }
                }

                if(newParentLength > oldParentLength) {
                    const oldValue = this.lengthsPerSection[lastIndex][this.lengthKey];
                    const neededWidthToAdd = newParentLength - oldParentLength;
                    const newValue = oldValue + neededWidthToAdd;
                    addUpdate(newValue)
                } else {
                    let neededWidthToRemove = oldParentLength - newParentLength;
                    let accumWidth = 0;

                    while(lastIndex >= 0 && neededWidthToRemove > 0) {
                        const dividerThickness = parseInt(this.dividerThickness);
                        const dividerOffset = (lastIndex === this.totalSections-1) ? 0 : dividerThickness;
                        const oldValue = this.lengthsPerSection[lastIndex][this.lengthKey];
                        const minValue = this.getSectionMinLength(lastIndex) + dividerOffset;

                        let newValue = oldValue - neededWidthToRemove;
                        if(newValue < minValue) {
                            newValue = minValue;
                        }
                        neededWidthToRemove -= (oldValue - newValue);
                        accumWidth += newValue;

                        addUpdate(newValue);
                        lastIndex--;
                    }
                }
                this.lengthsPerSection = {
                    ...this.lengthsPerSection,
                    ...updatedLengthsPerSection
                }
                this.$emit('lengths', payload);
            },
            updateSectionLengths(tryDelta) {
                const dividerThickness =  parseInt(this.dividerThickness);
                const beforeSectionIndex = this.isDraggingIndex;
                const afterSectionIndex = this.isDraggingIndex + 1;

                // deep copy the collapsed index states then remove the current ones
                // theyll be added back if needed.
                const newCollapsedFromLeftState = {
                    ...this.indexesBeforeCollapsed
                };
                const newCollapsedFromRightState = {
                    ...this.indexesAfterCollapsed
                };

                delete newCollapsedFromRightState[beforeSectionIndex];
                delete newCollapsedFromLeftState[afterSectionIndex];

                const copiedWidths = { ...this.lengthsPerSection };
                const curBeforeLength = this.lengthsPerSection[beforeSectionIndex][this.lengthKey];
                const curAfterLength = this.lengthsPerSection[afterSectionIndex][this.lengthKey];
 
                const dividerOffset = (tryDelta > 0 &&  afterSectionIndex === this.totalSections-1) ? 0 : dividerThickness; // if were moving right and on section before last, the divider offset is 0 since theres no divider on last element.
                const maxLength = (curBeforeLength + (Math.abs(this.getAfterPositionOfSection(beforeSectionIndex) - this.getAfterPositionOfSection(afterSectionIndex))) - dividerOffset);

                let tryNextBeforeLength = curBeforeLength + tryDelta;
                if(tryNextBeforeLength >= maxLength) {
                    tryDelta = maxLength - curBeforeLength;
                    tryNextBeforeLength = maxLength;
                    newCollapsedFromLeftState[afterSectionIndex] = true;
                    this.indexesBeforeCollapsed = newCollapsedFromLeftState;
                }  else if (tryNextBeforeLength <= dividerThickness) {
                    tryDelta = dividerThickness - curBeforeLength;
                    tryNextBeforeLength = dividerThickness;
                    newCollapsedFromRightState[beforeSectionIndex] = true;
                    this.indexesAfterCollapsed = newCollapsedFromRightState;
                }

                let tryNextAfterLength = curAfterLength - tryDelta;
                    
                if(tryDelta < 0) {
                    const minLength = this.getSectionMinLength(beforeSectionIndex) + dividerOffset;
                    // either negativ or 0
                    const beforeLengthUnderMinDifference = (Math.min(tryNextBeforeLength - minLength, 0));
                    // add (subtracting a negative) diff from after length
                    tryNextBeforeLength -= beforeLengthUnderMinDifference;
                    tryDelta -= beforeLengthUnderMinDifference
                    // subtract (adding a negative) from delta and after value
                    tryNextAfterLength += beforeLengthUnderMinDifference;
                } else if(tryDelta > 0) {
                    const minLength = this.getSectionMinLength(afterSectionIndex) + dividerOffset;
                    // either negativ or 0
                    const afterLengthUnderMinDifference = (Math.min(tryNextAfterLength - minLength, 0));
                    // add (subtracting a negative) diff from after length
                    tryNextAfterLength -= afterLengthUnderMinDifference;
                    // subtract (adding a negative) from delta and after value
                    tryNextBeforeLength += afterLengthUnderMinDifference;
                    tryDelta += afterLengthUnderMinDifference
                }
            
                if(Math.abs(tryDelta) > 0) {
                    copiedWidths[beforeSectionIndex][this.lengthKey] = tryNextBeforeLength;
                    copiedWidths[beforeSectionIndex].style = this.makeLengthStyleObject(this.lengthKey, tryNextBeforeLength)
                    copiedWidths[afterSectionIndex][this.lengthKey] = tryNextAfterLength;
                    copiedWidths[afterSectionIndex].style = this.makeLengthStyleObject(this.lengthKey, tryNextAfterLength)
                    const lastBeforeLength = this.lengthsPerSection[beforeSectionIndex][this.lengthKey];
                    const lastAfterLength = this.lengthsPerSection[afterSectionIndex][this.lengthKey];

                    this.lengthsPerSection = copiedWidths;
                    const payload = [
                        {
                            index: beforeSectionIndex,
                            oldLength: lastBeforeLength,
                            newLength: tryNextBeforeLength,
                        },{
                            index: afterSectionIndex,
                            oldLength: lastAfterLength,
                            newLength: tryNextAfterLength,
                    }];
        
                    this.$emit('lengths', payload);
                }
            },
            handleDragStart(event, index) {
                this.isDraggingIndex=index;
                this.lastDragPosition = event[this.eventPosKey];
                this.$emit('drag-start', { index, ...this.draggingItems })
            },
            handleDragSection(e) {
                e.preventDefault();
                const curDragPosition =  e[this.eventPosKey];
                let delta = curDragPosition - this.lastDragPosition;
                const sign = Math.sign(delta);
                this.lastDragPosition = curDragPosition;
                const afterPos = this.getAfterPositionOfSection(this.isDraggingIndex);
                if(sign > 0) {
                    // trying to move right/down, make sure the right side of the left section's bounding box is at close to it
                    if(afterPos > curDragPosition+5) {
                        //noop... too far away.
                        return;
                    } else if (afterPos < curDragPosition-5) {
                        // right side is lagging behind, let it catch up.6
                        delta = curDragPosition-afterPos;
                    }
                } else if(sign < 1) {
                    // moving left/up...
                    if(afterPos < curDragPosition-5) {
                        //noop... too far away.
                        return;
                    } else if (afterPos > curDragPosition+5) {
                        // right side is lagging behind, let it catch up.
                        delta = curDragPosition - afterPos;
                    }
                }
                this.updateSectionLengths(delta);
            },
            handleDragEnd() {
                this.$emit('drag-end', { index: this.isDraggingIndex, ...this.draggingItems });
                this.isDraggingIndex = -1;
            },
            makeLengthStyleObject(key, value) {
                if(typeof value !== "string") {
                    value = `${value}px`
                }
                return {
                    [`min${capitalize(key)}`]: value,
                    [`max${capitalize(key)}`]: value,
                    [key]: value,
                }
            },
        }
    }
</script>

<style scoped>
    .resizable-row-outer.row-is-dragging {
        cursor: ew-resize;
    }
    .resizable-row-outer.column-is-dragging {
        cursor: ns-resize;
    }
   .section-divider-handle {
        background-color: transparent;
        position: relative;
    }
    .section-divider-handle--column {
        width: 100%;
    }
    .section-divider-handle--row {
        height: 100%;
    }
    .section-divider-handle--column.is-dragging{
        cursor: ns-resize;
    }
    .section-divider-handle--row.is-dragging {
        cursor: ew-resize;
    }
    .slot-wrapper {
        position: relative;
        overflow: hidden;
    }
    .--resizable-child-slot-wrapper > div {
        width: 100%;
        min-width: 100%;
        max-width: 100%;
        height: 100%;
        min-height: 100%;
        max-height: 100%;
        position: relative;
    }
</style>

<style>
    body.--resizable-row-is-dragging {
        cursor: ew-resize !important;
    }
    body.--resizable-row-is-dragging > div {
        cursor: ew-resize !important;
    }
    body.--resizable-row-is-dragging > ul {
        cursor: ew-resize !important;
    }
    body.--resizable-column-is-dragging {
        cursor: ns-resize !important;
    }
    body.--resizable-column-is-dragging > div {
        cursor: ns-resize !important;
    }
    body.--resizable-column-is-dragging > ul {
        cursor: ns-resize !important;
    }
</style>