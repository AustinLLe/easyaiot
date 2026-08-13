/** Preserve Axios metadata (response, config, code and cause) for callers. */
export function throwOriginalTransportError(error: unknown): never {
  throw error
}
