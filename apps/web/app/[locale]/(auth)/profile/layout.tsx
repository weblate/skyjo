import { Locales } from "@skymo/shared/constants"

interface SignupParams {
  locale: Locales
}
export interface SignupProps {
  children: React.ReactNode
  params: Promise<SignupParams>
}

// export async function generateMetadata(props: SignupProps) {
//   const { locale } = await props.params
//   if (!routing.locales.includes(locale)) notFound()

//   const t = await getTranslations({ locale, namespace: "pages.Signup.head" })

//   const currentUrl = getCurrentUrl("rules", locale)

//   const metadata: Metadata = {
//     title: t("title"),
//     description: t("description"),
//     keywords: t("keywords").split(","),
//     alternates: {
//       canonical: currentUrl,
//       languages: generateAlternatesLanguages("rules"),
//     },
//     openGraph: {
//       title: t("title"),
//       description: t("description"),
//       url: currentUrl,
//     },
//     twitter: {
//       title: t("title"),
//       description: t("description"),
//     },
//   }

//   return metadata
// }

export default async function SignupLayout({ children }: SignupProps) {
  return children
}
