import SocketProvider from "@/contexts/SocketContext"

export interface LocaleLayoutProps {
  children: React.ReactNode
}

export default async function SocketLayout(props: Readonly<LocaleLayoutProps>) {
  return <SocketProvider>{props.children}</SocketProvider>
}
