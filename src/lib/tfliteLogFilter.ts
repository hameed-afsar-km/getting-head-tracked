/**
 * TensorFlow Lite log filter.
 *
 * The MediaPipe/TFLite WASM runtime writes its stdout/stderr to the browser
 * console. TFLite emits informational lines such as
 * "INFO: Created TensorFlow Lite XNNPACK delegate for CPU." on stderr, which
 * Emscripten forwards to console.error — making the Next.js dev overlay report
 * a phantom "Console Error".
 *
 * The WASM glue captures console.error by reference when the module is
 * evaluated, so the filter must be installed before MediaPipe is loaded.
 */

const TFLITE_INFO_NOISE = /^\s*INFO:.*\bTensorFlow Lite\b/i;

type PatchedConsoleError = ((...args: unknown[]) => void) & {
  __tfliteLogFiltered?: boolean;
};

/**
 * Install a console.error filter that drops benign TensorFlow Lite INFO
 * lines and forwards everything else untouched. Idempotent.
 */
export function installTfliteLogFilter(): void {
  if (typeof window === 'undefined') return;

  const current = console.error as PatchedConsoleError;
  if (current.__tfliteLogFiltered) return;

  const patched: PatchedConsoleError = (...args: unknown[]) => {
    const message = args
      .filter((arg): arg is string => typeof arg === 'string')
      .join(' ');

    if (TFLITE_INFO_NOISE.test(message)) return;

    current.apply(console, args);
  };

  patched.__tfliteLogFiltered = true;
  console.error = patched;
}
