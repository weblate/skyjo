import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { useTransition } from "react"
import { toast } from "sonner"

type GoogleOAuthResponse =
  | {
      success: true
      redirectUrl?: string
    }
  | {
      success: false
      message: string
    }

const GoogleOAuthButton = () => {
  const t = useTranslations("components.GoogleOAuthButton")
  const [isPending, startTransition] = useTransition()

  const actionClick = async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/login/google`,
      {
        credentials: "include",
      },
    )
    const data = (await response.json()) as GoogleOAuthResponse
    if (!data.success) {
      console.error(data.message)
      toast.error(t("error"))
      return
    }

    if (data.redirectUrl) {
      window.location.href = data.redirectUrl
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
