import { beforeEach, describe, expect, it } from "vitest"
import { Card } from "../Card.js"

let card: Card

describe("Card", () => {
  beforeEach(() => {
    card = new Card(0)
  })

  it("should create a new card", () => {
    expect(card.value).toBe(0)
    expect(card.isVisible).toBeFalsy()
  })

  it("should create a new card with value, visibility and id defined in the constructor", () => {
    const id = crypto.randomUUID()
    const card = new Card(12, true, id)
    expect(card.value).toBe(12)
    expect(card.isVisible).toBeTruthy()
    expect(card.id).toBe(id)
  })

  it("should turn a card to visible", () => {
    expect(card.isVisible).toBeFalsy()

    card.turnVisible()

    expect(card.isVisible).toBeTruthy()
  })

  it("should return the card value", () => {
    const card = new Card(0)

    expect(card.value).toBe(0)
  })

  it("should return json with value as undefined if the card is not visible", () => {
    const id = crypto.randomUUID()
    const card = new Card(0, false, id)

    expect(card.toJson()).toMatchObject({
      id,
      value: undefined,
      isVisible: false,
    })
  })

  it("should return json with value if card is visible", () => {
    const card = new Card(0, true)

    expect(card.toJson()).toMatchObject({
      value: 0,
      isVisible: true,
    })
    expect(card.toJson().id).toBeDefined()
  })
})
