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

const canUseLocalStorage = typeof localStorage !== "undefined" && !!localStorage;
export function localStorageSet(k, v) {
    if(!canUseLocalStorage) return false;
    if(typeof v !== "object") {
        localStorage.setItem(k, v);
    } else {
        localStorage.setItem(k, JSON.stringify(v));
    }
    return true;
}  
export function localStorageGet(k) {
    if(!canUseLocalStorage) return null;
    return localStorage.getItem(k);
}

export function localStorageRemove(k) {
    if(!canUseLocalStorage) return null;
    localStorage.removeItem(k);
    return true;
}

export function roundFloat(number, places) {
    return parseFloat(number.toFixed(places));
}

export function addFloats(a, b, places) {
    return roundFloat(a+b, places);
}