import type { Error as ThrownError } from "@skymo/error"
import type { TransferHost } from "@/validations/hostTransfer.js"

export interface ClientToServerHostTransferEvents {
  "host:transfer": (data: TransferHost) => void
}

export interface ServerToClientHostTransferEvents {
  "host:transfer-error": (code: ThrownError) => void
}
