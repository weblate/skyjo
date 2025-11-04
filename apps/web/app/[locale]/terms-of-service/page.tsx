import { Locales } from "@skymo/shared/constants"
import dayjs from "dayjs"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/routing"

const LAST_PAGE_UPDATED_DATE = dayjs("2025-07-21 12:00:00")

const RichEmail = ({ email }: { email: string | undefined }) => {
  if (!email) return null

  return (
    <a
      href={`mailto:${email}`}
      className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
    >
      {email}
    </a>
  )
}

const PrivacyPolicyLink = (chunk: React.ReactNode) => (
  <Link
    href="/privacy-policy"
    className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
  >
    {chunk}
  </Link>
)

const Bold = (chunks: React.ReactNode) => <strong>{chunks}</strong>

interface TermsOfServicePageProps {
  params: Promise<{ locale: Locales }>
}
export async function generateMetadata({
  params,
}: TermsOfServicePageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({
    locale,
    namespace: "pages.TermsOfService.head",
  })

  return {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords"),
  }
}

const TermsOfServicePage = async ({ params }: TermsOfServicePageProps) => {
  const { locale } = await params
  const t = await getTranslations({
    locale,
    namespace: "pages.TermsOfService.content",
  })

  return (
    <div className="container max-w-6xl bg-body dark:bg-dark-body mt-16 mb-40 text-black dark:text-dark-font">
      <h1 className="text-3xl text-center mt-6">{t("title")}</h1>
      <p className="text-justify mt-8">
        {t("last-update.text", {
          date: LAST_PAGE_UPDATED_DATE.format(t("last-update.date-format")),
        })}
      </p>

      <p className="text-justify mt-8">{t.rich("welcome", { b: Bold })}</p>

      <section className="mt-8">
        <h2 className="text-2xl mb-4">{t("operator.title")}</h2>
        <p className="text-justify mb-4">{t("operator.content")}</p>
        <div className="ml-4 mb-4">
          <p>{t("operator.name")}</p>
          <p>
            {t.rich("operator.contact", {
              email: () => (
                <RichEmail email={process.env.NEXT_PUBLIC_CONTACT_EMAIL} />
              ),
            })}
          </p>
          <p>{t("operator.location")}</p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl mb-4">{t("eligibility.title")}</h2>
        <p className="text-justify mb-4">{t("eligibility.content")}</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>{t("eligibility.items.1")}</li>
          <li>{t("eligibility.items.2")}</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl mb-4">{t("account-guest-use.title")}</h2>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>{t("account-guest-use.items.1")}</li>
          <li>{t("account-guest-use.items.2")}</li>
          <li>{t("account-guest-use.items.3")}</li>
          <li>{t("account-guest-use.items.4")}</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl mb-4">{t("data-storage.title")}</h2>
        <p className="text-justify mb-4">{t("data-storage.content")}</p>

        <h3 className="text-xl mb-2 mt-4">
          {t("data-storage.all-players.title")}
        </h3>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>{t.rich("data-storage.all-players.items.1", { b: Bold })}</li>
          <li>{t("data-storage.all-players.items.2")}</li>
        </ul>

        <h3 className="text-xl mb-2 mt-4">
          {t("data-storage.registered-players.title")}
        </h3>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>{t("data-storage.registered-players.items.1")}</li>
          <li>
            {t.rich("data-storage.registered-players.items.2", { b: Bold })}
          </li>
        </ul>

        <p className="text-justify mt-4">
          {t.rich("data-storage.storage-location", {
            link: PrivacyPolicyLink,
          })}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl mb-4">{t("analytics-tracking.title")}</h2>
        <p className="text-justify mb-4">{t("analytics-tracking.content")}</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>{t.rich("analytics-tracking.items.1", { b: Bold })}</li>
          <li>{t("analytics-tracking.items.2")}</li>
          <li>{t.rich("analytics-tracking.items.3", { b: Bold })}</li>
        </ul>
        <p className="text-justify mt-4">
          {t("analytics-tracking.data-rights")}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl mb-4">{t("ads-monetization.title")}</h2>
        <p className="text-justify mb-4">
          {t.rich("ads-monetization.content", { b: Bold })}
        </p>
        <p className="text-justify mb-4">{t("ads-monetization.consent")}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl mb-4">{t("user-conduct.title")}</h2>
        <p className="text-justify mb-4">{t("user-conduct.content")}</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>{t("user-conduct.items.1")}</li>
          <li>{t("user-conduct.items.2")}</li>
          <li>{t("user-conduct.items.3")}</li>
        </ul>
        <p className="text-justify mt-4">{t("user-conduct.enforcement")}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl mb-4">{t("moderation-reporting.title")}</h2>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>{t("moderation-reporting.items.1")}</li>
          <li>{t("moderation-reporting.items.2")}</li>
          <li>{t("moderation-reporting.items.3")}</li>
          <li>{t("moderation-reporting.items.4")}</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl mb-4">{t("availability.title")}</h2>
        <p className="text-justify mb-4">{t("availability.content")}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl mb-4">{t("intellectual-property.title")}</h2>
        <p className="text-justify mb-4">
          {t("intellectual-property.content")}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl mb-4">{t("legal.title")}</h2>
        <p className="text-justify mb-4">
          {t.rich("legal.jurisdiction", { b: Bold })}
        </p>
        <p className="text-justify mb-4">{t("legal.disputes")}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl mb-4">{t("contact.title")}</h2>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            {t.rich("contact.general", {
              email: () => (
                <RichEmail email={process.env.NEXT_PUBLIC_CONTACT_EMAIL} />
              ),
            })}
          </li>
        </ul>
      </section>
    </div>
  )
}

export default TermsOfServicePage
