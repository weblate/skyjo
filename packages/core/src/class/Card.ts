import type { CardToJson } from "@/types/card.js"

interface CardInterface {
  readonly id: string
  readonly value: number
  readonly isVisible: boolean

  turnVisible(): void
  toJson(): CardToJson
}

export class Card implements CardInterface {
  id: string = crypto.randomUUID()
  value: number
  isVisible: boolean = false

  constructor(value: number, isVisible?: boolean, id?: string) {
    this.value = value
    if (isVisible) this.isVisible = isVisible
    if (id) this.id = id
  }

  turnVisible() {
    this.isVisible = true
  }

  toJson() {
    return {
      id: this.id,
      value: this.isVisible ? this.value : undefined,
      isVisible: this.isVisible,
    } satisfies CardToJson
  }
}
