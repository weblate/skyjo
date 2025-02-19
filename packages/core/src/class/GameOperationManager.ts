import type { Skyjo } from "@/class/Skyjo.js"

export interface GameOperationManagerInterface {
  updateGame(game: Skyjo): Promise<void>
  removeGame(gameCode: string): Promise<void>

  startRevealCardsAfkTimer(game: Skyjo): Promise<void>
  startPlayerAfkTimer(game: Skyjo, playerId: string): Promise<void>
  cancelPlayerAfkTimer(gameCode: string, playerId: string): Promise<void>

  getSocket(socketId: string): unknown
  removeSocket(socket: unknown): Promise<void>

  delayNewRound(
    game: Skyjo,
    callback: () => Promise<void>,
    ms: number,
  ): Promise<void>
}

export class DefaultGameOperationManager
  implements GameOperationManagerInterface
{
  async updateGame(): Promise<void> {}
  async removeGame(): Promise<void> {}
  async startRevealCardsAfkTimer(): Promise<void> {}
  async startPlayerAfkTimer(): Promise<void> {}
  async cancelPlayerAfkTimer(): Promise<void> {}

  async getSocket(): Promise<unknown> {
    return null
  }
  async removeSocket(): Promise<void> {}

  async delayNewRound(): Promise<void> {}
}
