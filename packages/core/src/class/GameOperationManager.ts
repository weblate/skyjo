import type { Game } from "@/class/Game.js"

export const defaultKickSocketOptions: KickSocketOptions = {
  emitEvent: true,
}
export interface KickSocketOptions {
  emitEvent?: boolean
}

export interface GameOperationManagerInterface {
  updateGame(game: Game): Promise<void>
  removeGame(gameCode: string): Promise<void>

  startRevealCardsAfkTimer(game: Game): Promise<void>
  cancelRevealCardsAfkTimer(gameCode: string): Promise<void>
  startPlayerAfkTimer(game: Game, playerId: string): Promise<void>
  cancelPlayerAfkTimer(gameCode: string, playerId: string): Promise<void>

  getSocket(socketId: string): unknown | undefined
  kickSocket(socket: unknown, options?: KickSocketOptions): Promise<void>

  delayNewRound(
    game: Game,
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
