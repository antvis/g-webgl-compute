export function createCanvas() {
  if (typeof document !== 'undefined') {
    return document.createElement('canvas');
  } else {
    throw new Error('Cannot create a canvas in this context');
  }
}
