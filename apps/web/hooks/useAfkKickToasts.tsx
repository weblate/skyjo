import { useTranslations } from "next-intl"
import { toast } from "sonner"

const afkWarningToastId = "afk-warning"
const afkKickedToastId = "afk-kicked"

export const useAfkKickToasts = () => {
  const t = useTranslations("components.AfkKick")

  const showAfkWarning = async () => {
    // toast.dismiss(afkWarningToastId)

    toast.warning(t("warning.title"), {
      description: t("warning.description"),
      duration: 15000,
      id: afkWarningToastId,
    })
  }

  const showAfkKick = async () => {
    // toast.dismiss(afkKickedToastId)

    toast.error(t("kicked.title"), {
      description: t("kicked.description"),
      duration: 15000,
      id: afkKickedToastId,
    })
  }

  const showPlayerAfkKick = async (playerName: string) => {
    toast.error(t("player-kicked.title", { playerName }), {
      description: t("player-kicked.description", { playerName }),
      duration: 15000,
      id: `player-afk-kicked-${playerName}`,
    })
  }

  return {
    showAfkWarning,
    showAfkKick,
    showPlayerAfkKick,
  }
}
