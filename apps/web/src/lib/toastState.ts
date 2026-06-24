type ToastListener = (type: 'error' | 'success' | 'info', message: string) => void

let listener: ToastListener | null = null

export function setToastListener(fn: ToastListener) {
  listener = fn
}

export function clearToastListener() {
  listener = null
}

export function showToast(type: 'error' | 'success' | 'info', message: string) {
  listener?.(type, message)
}
