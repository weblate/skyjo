// Common errors that can happen on any event
export interface ServerToClientErrorEvents {
  "error:rate-limit": () => void
}
