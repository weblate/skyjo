import { Locales } from "@skymo/shared/constants"
import LoginPage from "./LoginPage"

interface LoginServerPageProps {
  params: Promise<{ locale: Locales }>
}
const LoginServerPage = async (props: LoginServerPageProps) => {
  const { locale } = await props.params
  return <LoginPage locale={locale} />
}

export default LoginServerPage
