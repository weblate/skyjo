import {
  CardToJson,
  ConnectionStatus,
  Constants as CoreConstants,
  GameToJson,
  PlayerToJson,
} from "@skymo/core"

export const createMockPlayer = (
  id: string,
  connectionStatus: ConnectionStatus = CoreConstants.CONNECTION_STATUS
    .CONNECTED,
  cards: CardToJson[][] = [],
): PlayerToJson => ({
  id,
  name: `Player ${id}`,
  socketId: `socket-${id}`,
  avatar: CoreConstants.AVATARS.BEE,
  score: 0,
  wantsReplay: false,
  connectionStatus,
  scores: [],
  turnStartTime: null,
  cards,
})

export const createMockCard = (
  id: string,
  value?: number,
  isVisible = false,
): CardToJson => ({
  id,
  value,
  isVisible,
})

export const createMockGame = (
  overrides: Partial<GameToJson> = {},
): GameToJson => ({
  code: "TEST123",
  status: CoreConstants.GAME_STATUS.LOBBY,
  hostId: "player1",
  players: [createMockPlayer("player1"), createMockPlayer("player2")],
  turn: 0,
  settings: {
    isConfirmed: false,
    private: false,
    maxPlayers: 4,
    removeIdenticalColumn: false,
    removeIdenticalRow: false,
    initialTurnedCount: 2,
    cardPerRow: 3,
    cardPerColumn: 4,
    scoreToEndGame: 100,
    firstPlayerMultiplierPenalty: 2,
    firstPlayerFlatPenalty: 0,
    firstPlayerPenaltyType:
      CoreConstants.FIRST_PLAYER_PENALTY_TYPE.MULTIPLIER_ONLY,
    showCurrentScore: true,
  },
  selectedCardValue: null,
  roundPhase: CoreConstants.ROUND_PHASE.REVEAL_CARDS,
  turnStatus: CoreConstants.TURN_STATUS.CHOOSE_A_PILE,
  lastDiscardCardValue: undefined,
  lastTurnStatus: CoreConstants.LAST_TURN_STATUS.PICK_FROM_DRAW_PILE,
  stateVersion: 1,
  updatedAt: new Date(),
  ...overrides,
})
