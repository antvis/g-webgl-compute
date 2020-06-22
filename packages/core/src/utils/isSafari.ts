export const isSafari =
  typeof navigator !== 'undefined' &&
  /Version\/[\d\.]+.*Safari/.test(navigator.userAgent);
