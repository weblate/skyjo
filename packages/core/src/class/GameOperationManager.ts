import type { Skyjo } from "@/class/Skyjo.js"

export interface GameOperationManagerInterface {
  updateGame(game: Skyjo): Promise<void>
  removeGame(gameCode: string): Promise<void>

  startRevealCardsAfkTimer(game: Skyjo): Promise<void>
  cancelRevealCardsAfkTimer(gameCode: string): Promise<void>
  startPlayerAfkTimer(game: Skyjo, playerId: string): Promise<void>
  cancelPlayerAfkTimer(gameCode: string, playerId: string): Promise<void>

  getSocket(socketId: string): unknown | undefined
  kickSocket(socket: unknown): Promise<void>

  delayNewRound(
    game: Skyjo,
    callback: () => Promise<void>,
    ms: number,
  ): Promise<void>
}

export class DefaultGameOperationManager
  implements GameOperationManagerInterface
{
  async updateGame(): Promise<void> {
    /* Placeholder that should not be called */
  }
  async removeGame(): Promise<void> {
    /* Placeholder that should not be called */
  }
  async startRevealCardsAfkTimer(): Promise<void> {
    /* Placeholder that should not be called */
  }
  async cancelRevealCardsAfkTimer(): Promise<void> {
    /* Placeholder that should not be called */
  }

  async startPlayerAfkTimer(): Promise<void> {
    /* Placeholder that should not be called */
  }
  async cancelPlayerAfkTimer(): Promise<void> {
    /* Placeholder that should not be called */
  }

  getSocket() {
    return undefined
  }
  async kickSocket(): Promise<void> {
    /* Placeholder that should not be called */
  }

  async delayNewRound(): Promise<void> {
    /* Placeholder that should not be called */
  }
}
