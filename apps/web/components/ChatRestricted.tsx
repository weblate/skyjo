import { ClassValue } from "clsx"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface ChatRestrictedProps {
  className?: ClassValue
}
const ChatRestricted = ({ className }: ChatRestrictedProps) => {
  const t = useTranslations("components.ChatRestricted")
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center bg-white dark:bg-dark-input border-2 border-black dark:border-dark-border rounded-md w-full px-1 py-2",
        className,
      )}
    >
      <p className="text-sm text-black dark:text-dark-font">
        {t("description")}
      </p>
    </div>
  )
}

export default ChatRestricted
