// Mac (incl. iOS) uses ⌘, everything else uses Ctrl
const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iP(hone|od|ad)/.test(navigator.platform || navigator.userAgent || '')

export const MOD_KEY = isMac ? '⌘' : 'Ctrl'
export const IS_MAC = isMac
