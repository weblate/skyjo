"use client"
import {
  ChatNotificationSize,
  GameBoardSize,
  TimerDisplayMode,
} from "@skymo/shared/constants"
import dayjs from "dayjs"
import { useTranslations } from "next-intl"
import { Dispatch, SetStateAction } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSettings } from "@/contexts/SettingsContext"
import { useSettingsSync } from "@/hooks/useSettingsSync"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: Dispatch<SetStateAction<boolean>>
}

const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const t = useTranslations("components.SettingsDialog")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[70svh] px-0 pb-1.5 bg-body dark:bg-dark-body flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {t("title")}
          </DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <Tabs
          defaultValue="audio"
          className="flex flex-col grow overflow-y-auto"
        >
          <TabsList className="px-6 grid grid-cols-5 sm:grid-cols-4 w-full">
            <TabsTrigger value="audio" className="h-10">
              {t("audio.title")}
            </TabsTrigger>
            <TabsTrigger value="gameplay" className="h-10">
              {t("gameplay.title")}
            </TabsTrigger>
            <TabsTrigger value="chat" className="h-10">
              {t("chat.title")}
            </TabsTrigger>
            <TabsTrigger value="account" className="h-10">
              {t("account.title")}
            </TabsTrigger>
            <TabsTrigger value="mobile" className="h-10 flex sm:hidden">
              {t("mobile.title")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="audio">
            <AudioSettings />
          </TabsContent>
          <TabsContent value="gameplay">
            <GameplaySettings />
          </TabsContent>
          <TabsContent value="chat">
            <ChatSettings />
          </TabsContent>
          <TabsContent value="account">
            <AccountSettings />
          </TabsContent>
          <TabsContent value="mobile" className="sm:hidden">
            <MobileSettings />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

const AudioSettings = () => {
  const t = useTranslations("components.SettingsDialog.audio")
  const { settings, updateSetting } = useSettings()

  return (
    <div className="px-6 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="sound-enabled">{t("toggle.label")}</Label>
        <Switch
          id="sound-enabled"
          checked={settings.audio ?? true}
          onCheckedChange={(value) => updateSetting("audio", value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{t("volume.label", { volume: settings.volume })}</Label>
        <Slider
          value={[settings.volume ?? 50]}
          onValueChange={(value) => updateSetting("volume", value[0])}
          min={0}
          max={100}
          step={1}
          disabled={!settings.audio}
        />
      </div>
    </div>
  )
}

const ChatSettings = () => {
  const t = useTranslations("components.SettingsDialog.chat")
  const { settings, updateSetting } = useSettings()

  return (
    <div className="px-6 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="chat-visibility">{t("chat-visibility")}</Label>
        <Switch
          id="chat-visibility"
          checked={settings.chatVisibility}
          onCheckedChange={(value) => updateSetting("chatVisibility", value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{t("chat-notification-size.label")}</Label>
        <RadioGroup
          value={settings.chatNotificationSize}
          onValueChange={(value) =>
            updateSetting("chatNotificationSize", value as ChatNotificationSize)
          }
          disabled={!settings.chatVisibility}
          className="flex gap-4"
        >
          {Object.values(ChatNotificationSize).map((size) => (
            <div className="flex items-center space-x-2" key={size}>
              <RadioGroupItem
                value={size}
                id={`chat-notification-size-${size}`}
              />
              <Label htmlFor={`chat-notification-size-${size}`}>
                {t(`chat-notification-size.values.${size}`)}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  )
}

const MobileSettings = () => {
  const t = useTranslations("components.SettingsDialog.mobile")
  const { settings, updateSetting } = useSettings()

  return (
    <div className="px-6 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="switch-to-player-who-is-playing">
          {t("switch-to-player-who-is-playing")}
        </Label>
        <Switch
          id="switch-to-player-who-is-playing"
          checked={settings.switchToPlayerWhoIsPlaying}
          onCheckedChange={(value) =>
            updateSetting("switchToPlayerWhoIsPlaying", value)
          }
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="show-preview-opponents-cards">
          {t("show-preview-opponents-cards")}
        </Label>
        <Switch
          id="show-preview-opponents-cards"
          checked={settings.showPreviewOpponentsCardsForMobile}
          onCheckedChange={(value) =>
            updateSetting("showPreviewOpponentsCardsForMobile", value)
          }
        />
      </div>
    </div>
  )
}

const GameplaySettings = () => {
  const t = useTranslations("components.SettingsDialog.gameplay")
  const { settings, updateSetting } = useSettings()

  return (
    <div className="px-6 flex flex-col gap-8">
      {/* Gameboard Section */}
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("gameboard.title")}</h2>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <div>
              <Label>{t("gameboard.size.label")}</Label>
              {settings.gameBoardSize === GameBoardSize.BIG && (
                <p className="text-xs text-orange-600">
                  {t("gameboard.size.big-warning")}
                </p>
              )}
            </div>
            <RadioGroup
              value={settings.gameBoardSize}
              onValueChange={(value) =>
                updateSetting("gameBoardSize", value as GameBoardSize)
              }
              className="flex gap-4"
            >
              {Object.values(GameBoardSize).map((size) => (
                <div className="flex items-center space-x-1" key={size}>
                  <RadioGroupItem value={size} id={`gameboard-size-${size}`} />
                  <Label htmlFor={`gameboard-size-${size}`}>
                    {t(`gameboard.size.values.${size}`)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="enlarge-active-player-board">
              {t("gameboard.enlarge-active-player-board")}
            </Label>
            <Switch
              id="enlarge-active-player-board"
              checked={settings.enlargeActivePlayerBoard}
              onCheckedChange={(value) =>
                updateSetting("enlargeActivePlayerBoard", value)
              }
            />
          </div>
        </div>
      </div>

      {/* Timer Section */}
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("timer.title")}</h2>
        <div className="flex flex-col gap-1">
          <Label>{t("timer.label")}</Label>
          <p className="text-sm text-gray-700 dark:text-dark-font/80 mt-1 mb-2">
            {t("timer.description")}
          </p>
          <RadioGroup
            value={settings.timerDisplayMode}
            onValueChange={(value) =>
              updateSetting("timerDisplayMode", value as TimerDisplayMode)
            }
            className="flex gap-4"
          >
            {Object.values(TimerDisplayMode).map((mode) => (
              <div className="flex items-center space-x-1" key={mode}>
                <RadioGroupItem value={mode} id={mode} />
                <Label htmlFor={mode}>{t(`timer.modes.${mode}`)}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>
    </div>
  )
}

const AccountSettings = () => {
  const t = useTranslations("components.SettingsDialog.account")
  const {
    settingsSyncState,
    enableSettingsSync,
    disableSettingsSync,
    isOnline,
  } = useSettingsSync()

  return (
    <div className="px-6 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-sync">{t("sync.label")}</Label>
        <p className="text-sm text-gray-700 dark:text-dark-font/80">
          {t("sync.description")}
        </p>
        <div className="flex items-center gap-2">
          <Switch
            id="settings-sync"
            checked={settingsSyncState.isEnabled}
            onCheckedChange={(checked) =>
              checked ? enableSettingsSync() : disableSettingsSync()
            }
          />
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {settingsSyncState.isEnabled
                ? t("sync.enabled")
                : t("sync.disabled")}
            </span>
            {settingsSyncState.isLoading && (
              <span className="text-xs text-gray-500">{t("sync.syncing")}</span>
            )}
            {!isOnline && (
              <span className="text-xs text-orange-600">
                {t("sync.offline")}
              </span>
            )}
          </div>
        </div>
        {settingsSyncState.error && (
          <p className="text-sm text-red-600">
            {t("sync.error")}: {settingsSyncState.error}
          </p>
        )}
        {settingsSyncState.lastSyncTime && (
          <p className="text-xs text-gray-500">
            {t("sync.lastSync", {
              date: dayjs(settingsSyncState.lastSyncTime).format(
                "DD/MM/YYYY HH:mm",
              ),
            })}
          </p>
        )}
      </div>
    </div>
  )
}

export default SettingsDialog
