export type BotDifficulty = "easy" | "medium" | "hard"

export type Position = {
  row: number
  col: number
}

export type BotAction =
  | { type: "reveal"; position: Position }
  | { type: "pick-discard"; replaceAt: Position }
  | { type: "pick-draw" }
  | { type: "replace"; position: Position }
  | { type: "discard" }
  | { type: "turn"; position: Position }

export type ColumnOpportunity = {
  colIndex: number
  matchingValue: number
  matchCount: number
  hiddenPositions: Position[]
}

export type RowOpportunity = {
  rowIndex: number
  matchingValue: number
  matchCount: number
  hiddenPositions: Position[]
}

export type PatternMatch = {
  type: "column" | "row"
  index: number
  value: number
  hiddenPosition: Position
}
