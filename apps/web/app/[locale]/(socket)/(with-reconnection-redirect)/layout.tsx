import { Locales } from "@skymo/shared/constants"
import { RedirectType } from "next/dist/client/components/redirect-error"
import { redirect } from "@/i18n/routing"
import { canReconnect } from "@/utils/canReconnect"

export interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: Locales }>
}

export default async function SocketLayout(props: Readonly<LocaleLayoutProps>) {
  const params = await props.params
  const { lastGame, isPrivate } = await canReconnect()

  if (lastGame && !isPrivate) {
    redirect(
      {
        href: "/reconnect",
        locale: params.locale,
      },
      RedirectType.replace,
    )
  }

  return props.children
}
