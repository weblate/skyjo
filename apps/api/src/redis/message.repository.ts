import type { ChatMessage } from "@skymo/shared/types"
import { RedisClient } from "@/redis/client.js"
import { GameRepository } from "@/redis/game.repository.js"

export class MessageRepository extends RedisClient {
  async storeMessage(gameCode: string, message: ChatMessage) {
    const client = await MessageRepository.getClient()

    const key = this.getGameMessagesKey(gameCode)

    await client.hSet(key, message.id, JSON.stringify(message))
    await client.expire(key, GameRepository.GAME_TTL)
  }

  async getMessageById(gameCode: string, messageId: string) {
    const client = await MessageRepository.getClient()

    const key = this.getGameMessagesKey(gameCode)
    const message = await client.hGet(key, messageId)

    if (!message) return null
    return JSON.parse(message) as ChatMessage
  }

  private getGameMessagesKey(gameCode: string) {
    return `game:${gameCode}:messages`
  }
}
