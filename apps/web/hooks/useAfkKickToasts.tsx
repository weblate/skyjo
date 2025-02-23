import { useToast } from "@/components/ui/use-toast"
import { useTranslations } from "next-intl"

export const useAfkKickToasts = () => {
  const { toast } = useToast()
  const t = useTranslations("components.AfkKick")

  const showAfkWarning = () => {
    toast({
      title: t("warning.title"),
      description: t("warning.description"),
      variant: "warn",
      duration: 15000,
    })
  }

  const showAfkKick = () => {
    toast({
      title: t("kicked.title"),
      description: t("kicked.description"),
      variant: "destructive",
      duration: 15000,
    })
  }

  const showPlayerAfkKick = (playerName: string) => {
    toast({
      title: t("player-kicked.title", { playerName }),
      description: t("player-kicked.description", { playerName }),
      duration: 15000,
    })
  }

  return {
    showAfkWarning,
    showAfkKick,
    showPlayerAfkKick,
  }
}
