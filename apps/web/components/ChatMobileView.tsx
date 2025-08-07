import { ClassValue } from "clsx"
import { MessageCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import ChatNotLoggedIn from "@/components/ChatNotLoggedIn"
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
import { useAuth } from "@/hooks/useAuth"
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
  className,
}: ChatDrawerProps) => {
  const t = useTranslations("components.Chat")
  const { hasUnreadMessage } = useChat()
  const { isAuthenticated } = useAuth()

  return (
    <Drawer open={open} onOpenChange={toggleOpening} repositionInputs={false}>
      <DrawerTrigger asChild>
        <Button
          variant="icon"
          className={cn("fixed bottom-4 right-4", className)}
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
        <div className="px-4 my-2 flex flex-1 flex-col-reverse overflow-y-auto">
          <ChatMessageList />
        </div>
        <DrawerFooter className="p-4 pt-0">
          {!isAuthenticated && <ChatNotLoggedIn />}
          <ChatForm chatOpen={open} disabled={!isAuthenticated} />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

export { ChatMobileView }
