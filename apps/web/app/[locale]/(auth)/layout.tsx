import { getUser } from "@/lib/dal"

export interface AuthLayoutProps {
  children: React.ReactNode
}

export default async function AuthLayout(props: Readonly<AuthLayoutProps>) {
  await getUser()

  return <>{props.children}</>
}
