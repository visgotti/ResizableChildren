export function pixelValidator(v) {
    if(isPixelValue(v) || isPercentValue(v)) {
        return true;
    }
    console.error('Style length props need to end in either % or px');
    return false;
}
export function isPixelValue(v) {
    return `${v}`.charAt(v.length - 1) === 'x' && `${v}`.charAt(v.length - 2) === 'p';
}
export function isPercentValue(v) {
    return `${v}`.charAt(v.length - 1) === '%'
}
export function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}