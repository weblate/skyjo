import SocketProvider from "@/contexts/SocketContext"

export interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function SocketLayout(props: LocaleLayoutProps) {
  return <SocketProvider>{props.children}</SocketProvider>
}
