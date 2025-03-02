export interface ServerToClientAfkEvents {
  "kick:afk-warning": () => void
  "kick:afk": () => void
  "kick:player-afk": (playerName: string) => void
}
