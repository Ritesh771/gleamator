const listeners = new Set()

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function notify(toast) {
  for (const fn of Array.from(listeners)) fn(toast)
}

export default { subscribe, notify }
