import type {
  ServerMessageType,
  SystemMessageType,
  UserMessageType,
} from "@skymo/core"

export interface UserChatMessage {
  id: string
  name: string
  message: string
  type: UserMessageType
}

export interface SystemChatMessage {
  id: string
  message: string
  type: SystemMessageType
}

export interface ServerChatMessage {
  id: string
  name: string
  message: ServerMessageType
  type: ServerMessageType
}

export type ChatMessage =
  | UserChatMessage
  | SystemChatMessage
  | ServerChatMessage
