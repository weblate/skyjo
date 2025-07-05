import type { Game, GameToJson } from "@skymo/core"
import {
  createStateOperations,
  type GameOperation,
} from "@skymo/state-operations"

export class GameStateTracker {
  private previousState: GameToJson
  private readonly game: Game

  constructor(game: Game) {
    this.previousState = structuredClone(game.toJson())
    this.game = game
  }

  getChanges(): GameOperation | null {
    const currentState = this.game.toJson()
    const operations = createStateOperations(this.previousState, currentState)

    if (Object.keys(operations).length === 0) return null
    else this.game.stateVersion++

    this.previousState = structuredClone(currentState)

    return operations
  }
}
