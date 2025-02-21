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
    })
  }

  const showAfkKick = () => {
    toast({
      title: t("kicked.title"),
      description: t("kicked.description"),
      variant: "destructive",
    })
  }

  const showPlayerAfkKick = (playerName: string) => {
    toast({
      title: t("player-kicked.title", { playerName }),
      description: t("player-kicked.description", { playerName }),
      duration: 5000,
    })
  }

  return {
    showAfkWarning,
    showAfkKick,
    showPlayerAfkKick,
  }
}
