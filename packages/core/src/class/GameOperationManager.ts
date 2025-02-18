import type { Skyjo } from "@/class/Skyjo.js"

export interface GameOperationManagerInterface {
  updateGame(game: Skyjo): Promise<void>
  startAfkTimer(game: Skyjo, playerId: string): Promise<void>
  cancelAfkTimer(gameCode: string, playerId: string): Promise<void>
  delayNewRound(game: Skyjo, callback: () => Promise<void>, ms: number): Promise<void>
}

export class DefaultGameOperationManager
  implements GameOperationManagerInterface
{
  async updateGame(): Promise<void> {}
  async startAfkTimer(): Promise<void> {}
  async cancelAfkTimer(): Promise<void> {}
  async delayNewRound(): Promise<void> {}
}
