<template>
    <div class="resizable-row-outer"
         :ref="'outer'"
         :style="{
             ...outerStyleObject
         }"
    >
        <resize-observer @notify="updateSectionLengthsFromParentResize" />
        <div
            class="slot-wrapper --resizable-child-slot-wrapper"
            v-for="(slot, i) in $slots.default"
            :key="`slot-wrapper-${i}`"
            :style="lengthsPerSection[i] && lengthsPerSection[i].style"
            :ref="`section${i}`"
        >
            <render-slot :value='slot'
                :style="innerStyleObjects[i]"
            />
            <div  v-if="i < totalSections-1"
                  class="section-divider"
                  :style="{
                    ...dividerStyleObject,
                    ...dividerOffsetStyle
                  }"
            >
                <div
                        class="section-divider-handle"
                        :class="dividerClass"
                        @mousedown="(e) => handleDragStart(e, i)"
                        :style="dividerHandleStyleObject"
                >
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import renderSlot from "./renderSlot";
    import { capitalize, isPixelValue, pixelValidator } from "../utils";
    import 'vue-resize/dist/vue-resize.css'
    import { ResizeObserver } from 'vue-resize'
    import 'vue-resize/dist/vue-resize.css'

    export default {
        name: 'ResizableChildren',
        components: {
            renderSlot,
            ResizeObserver
        },
        created() {
            this.updateSectionLengthsFromParentResize = this.updateSectionLengthsFromParentResize.bind(this);
            this.totalSections = this.$slots.default.length;
            this.totalDividerLength = (this.totalSections-1) * parseInt(this.dividerThickness);
            this.dividerHandleOffset = `-${Math.floor((parseInt(this.dividerHandleThickness) - parseInt(this.dividerThickness)) / 2)}px`;
            this.handleDragEnd = this.handleDragEnd.bind(this);
            document.addEventListener('mouseup', this.handleDragEnd);
            this.handleDragSection = this.handleDragSection.bind(this);
        },
        mounted() {
            this.parseStartPercents();
            this.setDefaultLengths();
            this.initializedLengths = true;
            this.dividerOffsetStyle = this.getDividerOffset();
        },
        beforeDestroy() {
          this.initializedLengths = false;
            if(this.isDraggingIndex > 0) {
                this.isDraggingIndex = -1;
            }
            document.removeEventListener('mouseup', this.handleDragEnd);
        },
        props: {
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
            }
        },
        data() {
            return {
                initializedLengths: false,
                utilizedParentLength: '0px',
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
            dividerClass() { return `section-divider-handle--${this.direction}` },
            dividerLengthKey() { return this.isRow ? 'clientWidth' : 'clientHeight' },
            beforeKey() { return this.isRow ? 'left' : 'top' },
            afterKey() { return this.isRow ? 'right' : 'bottom' },
            eventPosKey() { return this.isRow ? 'clientX' : 'clientY'; },
            lengthKey() { return this.isRow ? 'width' : 'height'; },
            innerStyleObjects() {
                const obj = {};
                Object.keys(this.lengthsPerSection).forEach((k, i) => {
                    let value = this.lengthsPerSection[k][this.lengthKey];
                    // only if were the last section do we not care about the offset since it wont have a divider..
                    const offsetForDivider = i !== this.totalSections ? this.dividerLength : 0;
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
            isDraggingIndex(newV, oldV) {
                if(oldV < 0 && newV >= 0) {
                    document.body.classList.add(this.bodyClass);
                    document.addEventListener('mousemove', this.handleDragSection);
                } else if (oldV >= 0 && newV < 0) {
                    document.body.classList.remove(this.bodyClass);
                    document.removeEventListener('mousemove', this.handleDragSection);
                }
            }
        },
        methods: {
            parseStartPercents() {
                this.utilizedStartPercent = 0;
                for(let i = 0; i < this.$slots.default.length; i++) {
                    const percent = this.$slots.default[i];
                    if(percent.data && percent.data.attrs) {
                        const startPercent = percent.data.attrs['start-percent'];
                        if(startPercent !== null && !isNaN(startPercent) && startPercent > 0) {
                            this.startPercents[i] =startPercent;
                            this.utilizedStartPercent+=startPercent;
                            if(this.utilizedStartPercent > 100) {
                                throw new Error(`Total start percent can not go above 100.`)
                            }
                        } else {
                            if('start-percent' in percent.data.attrs) {
                                throw new Error(`Invalid start percent attribute ${startPercent} given on slot #${i}; must be an integer value 0 or above.`)
                            }
                        }
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
                    this.utilizedParentLength = this.$refs.outer[this.dividerLengthKey];
                    const utilizedStartPixels = this.utilizedParentLength * (this.utilizedStartPercent/100);
                    const totalLength = this.utilizedParentLength - utilizedStartPixels;
                    evenLength = Math.floor(totalLength/(this.totalSections-Object.keys(this.startPercents).length));
                }
                let utilized = 0;
                for(let i = 0; i < this.totalSections; i++) {
                    let lengthToUse = i in this.startPercents ? Math.floor(this.utilizedParentLength * (this.startPercents[i] / 100)) : evenLength;
                    utilized+=lengthToUse;
                    if(i === this.totalSections-1) {
                        if(this.utilizedParentLength-utilized > 0) {
                            //add remainder if were on last section and there's still length left to use from flooring the values.
                            lengthToUse+= this.utilizedParentLength-utilized;
                        }
                    }
                    newLengths[i] = {
                        [this.lengthKey]: lengthToUse,
                        style: this.makeLengthStyleObject(this.lengthKey,  `${lengthToUse}px`)
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
            getBeforePositionOfSection(sectionIndex) {
                return parseInt(this.$refs[`section${sectionIndex}`][0].getBoundingClientRect()[this.beforeKey])
            },
            getAfterPositionOfSection(sectionIndex) {
                return parseInt(this.$refs[`section${sectionIndex}`][0].getBoundingClientRect()[this.afterKey])
            },
            updateSectionLengthsFromParentResize(resized) {
                if(!this.initializedLengths) return false;
                let value = resized[this.lengthKey];
                if(parseInt(this.utilizedParentLength) !== parseInt(value)) {
                    this.utilizedParentLength = value;
                    const neededDiff = this.utilizedParentLength - this.getAfterPositionOfSection(this.totalSections - 1);
                    const oldValue = this.lengthsPerSection[this.totalSections-1][this.lengthKey];
                    let newValue = oldValue + neededDiff;
                    if(newValue + this.getBeforePositionOfSection(this.totalSections - 1) > value) {
                        newValue -= newValue + this.getBeforePositionOfSection(this.totalSections - 1) - value;
                    }
                    this.lengthsPerSection = {
                        ...this.lengthsPerSection,
                        [this.totalSections-1]: {
                            [this.lengthKey]: newValue,
                            style: this.makeLengthStyleObject(this.lengthKey, `${newValue}px`)
                        }
                    }
                    const payload = [
                        {
                            index: this.totalSections-1,
                            oldLength: oldValue,
                            newLength: newValue,
                        }
                    ];
                    this.$emit('lengths', payload);
                }
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

                const tryNextAfterLength = curAfterLength - tryDelta;
                if(Math.abs(tryDelta) > 0) {
                    copiedWidths[beforeSectionIndex][this.lengthKey] = tryNextBeforeLength;
                    copiedWidths[beforeSectionIndex].style = this.makeLengthStyleObject(this.lengthKey, `${tryNextBeforeLength}px`)
                    copiedWidths[afterSectionIndex][this.lengthKey] = tryNextAfterLength;
                    copiedWidths[afterSectionIndex].style = this.makeLengthStyleObject(this.lengthKey, `${tryNextAfterLength}px`)
                    const lastBeforeLength = this.lengthsPerSection[beforeSectionIndex][this.lengthKey];
                    const lastAfterLength = this.lengthsPerSection[afterSectionIndex][this.lengthKey];

                    this.lengthsPerSection = copiedWidths;
                    const payload = [
                        {
                            index: beforeSectionIndex,
                            oldLength: lastBeforeLength,
                            newLength: tryNextBeforeLength,
                        }
                        ,{
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
                this.isDraggingIndex = -1;
            },
            makeLengthStyleObject(key, value) {
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
    .slot-wrapper {
        position: relative;
        overflow: hidden;
    }
    .section-divider-handle {
        background-color: transparent;
        position: relative;
    }
    .section-divider-handle--column {
        width: 100%;
        cursor: ns-resize;
    }
    .section-divider-handle--row {
        height: 100%;
        cursor: ew-resize;
    }
</style>
<style>
    .--resizable-child-slot-wrapper > div {
        width: 100%;
        min-width: 100%;
        max-width: 100%;
        height: 100%;
        min-height: 100%;
        max-height: 100%;
        position: relative;
    }
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
