"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import RadioNumber from "@/components/ui/radio-number"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useGame } from "@/contexts/GameContext"
import { isHost } from "@/lib/game"
import {
  Constants as CoreConstants,
  type FirstPlayerPenaltyType,
} from "@skymo/core"
import { TriangleAlertIcon } from "lucide-react"
import { useTranslations } from "next-intl"

type GameSettingsProps = {
  className?: string
}

export const GameSettings = ({ className }: GameSettingsProps) => {
  const t = useTranslations("pages.Lobby")
  const { player, game, actions } = useGame()

  const host = isHost(game, player?.id)
  const nbCards = game.settings.cardPerColumn * game.settings.cardPerRow
  const maxInitialTurnedCount = nbCards === 1 ? 1 : nbCards - 1

  const disableInput =
    !host || (!game.settings.private && game.settings.isConfirmed)

  const disableFlatPenalty =
    game.settings.firstPlayerPenaltyType ===
    CoreConstants.FIRST_PLAYER_PENALTY_TYPE.MULTIPLIER_ONLY

  const disableMultiplierPenalty =
    game.settings.firstPlayerPenaltyType ===
    CoreConstants.FIRST_PLAYER_PENALTY_TYPE.FLAT_ONLY

  return (
    <div className={className}>
      <div className="flex flex-col gap-4 lg:gap-3 px-4 sm:px-8 overflow-y-scroll max-h-[30svh] lg:max-h-[50svh]">
        <div className="flex flex-row items-center gap-2">
          <Switch
            id="remove-identical-column"
            checked={game.settings.removeIdenticalColumn}
            onCheckedChange={(checked) =>
              actions.updateSingleSettings("removeIdenticalColumn", checked)
            }
            disabled={disableInput}
            title={t("settings.remove-identical-column")}
          />
          <Label htmlFor="remove-identical-column">
            {t("settings.remove-identical-column")}
          </Label>
        </div>
        <div className="flex flex-row items-center gap-2">
          <Switch
            id="remove-identical-row"
            checked={game.settings.removeIdenticalRow}
            onCheckedChange={(checked) =>
              actions.updateSingleSettings("removeIdenticalRow", checked)
            }
            disabled={disableInput}
            title={t("settings.remove-identical-row")}
          />
          <Label htmlFor="remove-identical-row">
            {t("settings.remove-identical-row")}
          </Label>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="nb-columns">{t("settings.nb-columns.label")}</Label>
          <RadioNumber
            name="nb-columns"
            max={CoreConstants.DEFAULT_GAME_SETTINGS.CARDS.PER_COLUMN}
            selected={game.settings.cardPerColumn}
            onChange={(value) =>
              actions.updateSingleSettings("cardPerColumn", value)
            }
            title={t("settings.nb-columns.title")}
            disabled={disableInput}
            disabledRadioNumber={game.settings.cardPerRow === 1 ? [1] : []}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="nb-rows">{t("settings.nb-rows.label")}</Label>
          <RadioNumber
            name="nb-rows"
            max={CoreConstants.DEFAULT_GAME_SETTINGS.CARDS.PER_ROW}
            selected={game.settings.cardPerRow}
            onChange={(value) =>
              actions.updateSingleSettings("cardPerRow", value)
            }
            title={t("settings.nb-rows.title")}
            disabled={disableInput}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="initial-turned-count">
            {t("settings.initial-turned-count.label")}
          </Label>
          <div className="flex flex-row gap-2 items-center">
            <Slider
              key={game.settings.initialTurnedCount}
              name={"initial-turned-count"}
              step={1}
              min={0}
              max={maxInitialTurnedCount}
              defaultValue={[game.settings.initialTurnedCount]}
              onValueCommit={(value) =>
                actions.updateSingleSettings("initialTurnedCount", +value)
              }
              title={t("settings.initial-turned-count.title", {
                number: game.settings.initialTurnedCount,
              })}
              disabled={disableInput}
            />
            <Input
              name={"initial-turned-count"}
              type="number"
              min={0}
              max={maxInitialTurnedCount}
              value={game.settings.initialTurnedCount}
              onChange={(e) =>
                actions.updateSingleSettings(
                  "initialTurnedCount",
                  +e.target.value,
                )
              }
              title={t("settings.initial-turned-count.title", {
                number: game.settings.initialTurnedCount,
              })}
              disabled={disableInput}
              className="w-16 text-center"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="score-to-end-game">
            {t("settings.score-to-end-game.label")}
          </Label>
          <div className="flex flex-row gap-2 items-center">
            <Slider
              key={game.settings.scoreToEndGame}
              name={"score-to-end-game"}
              step={10}
              min={10}
              max={1000}
              defaultValue={[game.settings.scoreToEndGame]}
              onValueCommit={(value) =>
                actions.updateSingleSettings("scoreToEndGame", +value)
              }
              title={t("settings.score-to-end-game.title", {
                number: game.settings.scoreToEndGame,
              })}
              disabled={disableInput}
            />
            <Input
              name={"score-to-end-game"}
              type="number"
              min={10}
              step={10}
              max={1000}
              value={game.settings.scoreToEndGame}
              onChange={(e) =>
                actions.updateSingleSettings("scoreToEndGame", +e.target.value)
              }
              title={t("settings.score-to-end-game.title", {
                number: game.settings.scoreToEndGame,
              })}
              disabled={disableInput}
              className="w-20 text-center"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex flex-row items-center gap-2">
            <Switch
              id="show-current-score"
              checked={game.settings.showCurrentScore}
              onCheckedChange={(checked) =>
                actions.updateSingleSettings("showCurrentScore", checked)
              }
              disabled={disableInput}
            />
            <Label htmlFor="show-current-score">
              {t("settings.show-current-score.label")}
            </Label>
          </div>
        </div>
        <hr className="w-full border-black dark:border-dark-border my-3" />
        <div className="flex flex-col gap-1">
          <Label htmlFor="first-player-penalty-type">
            {t("settings.first-player-penalty-type.label")}
          </Label>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("settings.first-player-penalty-type.description")}
          </p>
          <Select
            value={game.settings.firstPlayerPenaltyType.toString()}
            onValueChange={(value) =>
              actions.updateSingleSettings(
                "firstPlayerPenaltyType",
                +value as FirstPlayerPenaltyType,
              )
            }
            disabled={disableInput}
          >
            <SelectTrigger className="mt-2 w-fit">
              <SelectValue
                placeholder={t(
                  "settings.first-player-penalty-type.placeholder",
                )}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value={CoreConstants.FIRST_PLAYER_PENALTY_TYPE.MULTIPLIER_ONLY.toString()}
              >
                {t("settings.first-player-penalty-type.item.multiplier-only")}
              </SelectItem>
              <SelectItem
                value={CoreConstants.FIRST_PLAYER_PENALTY_TYPE.FLAT_ONLY.toString()}
              >
                {t("settings.first-player-penalty-type.item.flat-only")}
              </SelectItem>
              <SelectItem
                value={CoreConstants.FIRST_PLAYER_PENALTY_TYPE.FLAT_THEN_MULTIPLIER.toString()}
              >
                {t(
                  "settings.first-player-penalty-type.item.flat-then-multiplier",
                )}
              </SelectItem>
              <SelectItem
                value={CoreConstants.FIRST_PLAYER_PENALTY_TYPE.MULTIPLIER_THEN_FLAT.toString()}
              >
                {t(
                  "settings.first-player-penalty-type.item.multiplier-then-flat",
                )}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="first-player-multiplier-penalty">
            {t("settings.first-player-multiplier-penalty.label")}
          </Label>
          <div className="flex flex-row gap-2 items-center">
            <Slider
              key={game.settings.firstPlayerMultiplierPenalty}
              name={"first-player-multiplier-penalty"}
              step={1}
              min={1}
              max={10}
              defaultValue={[game.settings.firstPlayerMultiplierPenalty]}
              onValueCommit={(value) =>
                actions.updateSingleSettings(
                  "firstPlayerMultiplierPenalty",
                  +value,
                )
              }
              title={t("settings.first-player-multiplier-penalty.title", {
                number: game.settings.firstPlayerMultiplierPenalty,
              })}
              disabled={disableInput || disableMultiplierPenalty}
            />
            <Input
              name={"first-player-multiplier-penalty"}
              type="number"
              min={1}
              max={10}
              value={game.settings.firstPlayerMultiplierPenalty}
              onChange={(e) =>
                actions.updateSingleSettings(
                  "firstPlayerMultiplierPenalty",
                  +e.target.value,
                )
              }
              title={t("settings.first-player-multiplier-penalty.title", {
                number: game.settings.firstPlayerMultiplierPenalty,
              })}
              disabled={disableInput || disableMultiplierPenalty}
              className="w-16 text-center"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="first-player-flat-penalty">
            {t("settings.first-player-flat-penalty.label")}
          </Label>
          <div className="flex flex-row gap-2 items-center">
            <Slider
              key={game.settings.firstPlayerFlatPenalty}
              name={"first-player-flat-penalty"}
              step={10}
              min={0}
              max={game.settings.scoreToEndGame}
              defaultValue={[game.settings.firstPlayerFlatPenalty]}
              onValueCommit={(value) =>
                actions.updateSingleSettings("firstPlayerFlatPenalty", +value)
              }
              title={t("settings.first-player-flat-penalty.title", {
                number: game.settings.firstPlayerFlatPenalty,
              })}
              disabled={disableInput || disableFlatPenalty}
            />
            <Input
              name={"first-player-flat-penalty"}
              type="number"
              min={0}
              step={10}
              max={game.settings.scoreToEndGame}
              value={game.settings.firstPlayerFlatPenalty}
              onChange={(e) =>
                actions.updateSingleSettings(
                  "firstPlayerFlatPenalty",
                  +e.target.value,
                )
              }
              title={t("settings.first-player-flat-penalty.title", {
                number: game.settings.firstPlayerFlatPenalty,
              })}
              disabled={disableInput || disableFlatPenalty}
              className="w-20 text-center"
            />
          </div>
        </div>
      </div>
      {host && !game.settings.private && (
        <div className="flex flex-row justify-center gap-1 mt-6 px-4 sm:px-8">
          <TriangleAlertIcon className="size-5 text-red-500 dark:text-red-600" />
          <p className="text-sm text-red-500 dark:text-red-600">
            {t("settings.validation-warning")}
          </p>
        </div>
      )}
    </div>
  )
}
