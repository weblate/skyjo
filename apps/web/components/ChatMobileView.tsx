import { ClassValue } from "clsx"
import { MessageCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useChat } from "@/contexts/ChatContext"
import { cn } from "@/lib/utils"
import ChatForm from "./ChatForm"
import { ChatMessageList } from "./ChatMessageList"

interface ChatDrawerProps {
  open: boolean
  toggleOpening: () => void
  disabled?: boolean
  className?: ClassValue
}
const ChatMobileView = ({
  open,
  toggleOpening,
  disabled = false,
  className,
}: ChatDrawerProps) => {
  const t = useTranslations("components.Chat")
  const { hasUnreadMessage } = useChat()

  return (
    <Drawer open={open} onOpenChange={toggleOpening} repositionInputs={false}>
      <DrawerTrigger asChild>
        <Button
          variant="icon"
          className={cn("fixed bottom-4 right-4", className)}
          disabled={disabled}
        >
          <MessageCircle className="h-[1.2rem] w-[1.2rem]" />
          {hasUnreadMessage && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[50svh]">
        <DrawerHeader className="p-3 pb-0">
          <DrawerTitle className="text-center">{t("title")}</DrawerTitle>
          <DrawerDescription></DrawerDescription>
        </DrawerHeader>
        <div className="px-4 my-2 flex flex-col-reverse overflow-y-auto">
          <ChatMessageList />
        </div>
        <DrawerFooter className="p-4 pt-0">
          <ChatForm chatOpen={open} disabled={disabled} />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

export { ChatMobileView }
