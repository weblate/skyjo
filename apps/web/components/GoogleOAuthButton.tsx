import type { OauthLoginError } from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

const GoogleOAuthButton = () => {
  const t = useTranslations("components.GoogleOAuthButton")
  const tErrors = useTranslations("errors")
  const [isPending, startTransition] = useTransition()

  const actionClick = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login/google`,
        {
          method: "GET",
          credentials: "include",
        },
      )

      if (!response.ok) {
        const error = await jsonError<OauthLoginError>(response)
        toast.error(tErrors(error))
        return
      }

      const data = await response.json()
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      }
    } catch (error) {
      console.error(error)

      toast.error(tErrors("oauth-login-initiation-failed"))
    }
  }

  return (
    <Button
      onClick={() => startTransition(async () => await actionClick())}
      loading={isPending}
      color="white"
      className="w-full gap-2 font-medium"
      title={t("button-title")}
    >
      <span className="w-8">
        <Image
          src="/auth/google.webp"
          alt=""
          width={32}
          height={32}
          draggable={false}
        />
      </span>
      <span className="w-16 text-left">Google</span>
    </Button>
  )
}

export default GoogleOAuthButton
