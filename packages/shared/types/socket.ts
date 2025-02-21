import type { ServerToClientAfkEvents } from "./events/afk.js"
import type {
  ClientToServerChatEvents,
  ServerToClientChatEvents,
} from "./events/chat.js"
import type {
  ClientToServerGameEvents,
  ServerToClientGameEvents,
} from "./events/game.js"
import type {
  ClientToServerKickEvents,
  ServerToClientKickEvents,
} from "./events/kick.js"
import type {
  ClientToServerLobbyEvents,
  ServerToClientLobbyEvents,
} from "./events/lobby.js"
import type {
  ClientToServerPlayerEvents,
  ServerToClientPlayerEvents,
} from "./events/player.js"
import type { ClientToServerSettingsEvents } from "./events/settings.js"

export type ClientToServerEvents = ClientToServerGameEvents &
  ClientToServerKickEvents &
  ClientToServerLobbyEvents &
  ClientToServerChatEvents &
  ClientToServerPlayerEvents &
  ClientToServerSettingsEvents

export interface ServerToClientEvents
  extends ServerToClientGameEvents,
    ServerToClientChatEvents,
    ServerToClientKickEvents,
    ServerToClientLobbyEvents,
    ServerToClientPlayerEvents,
    ServerToClientAfkEvents {}

export type SocketData = {
  gameCode: string
  playerId: string
}
