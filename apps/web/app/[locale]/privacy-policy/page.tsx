import dayjs from "dayjs"
import { useTranslations } from "next-intl"

const LAST_PAGE_UPDATED_DATE = dayjs("2025-07-03 13:31:00")

const RichEmail = () => (
  <a
    href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}
    className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
  >
    {process.env.NEXT_PUBLIC_CONTACT_EMAIL}
  </a>
)

const PrivacyPolicyPage = () => {
  const t = useTranslations("pages.PrivacyPolicy.content")

  return (
    <div className="container max-w-6xl bg-body dark:bg-dark-body mt-16 mb-40 text-black dark:text-dark-font">
      <h1 className="text-3xl text-center mt-6">{t("title")}</h1>
      <p className="text-justify mt-8">
        {t("last-update.text", {
          date: LAST_PAGE_UPDATED_DATE.format(t("last-update.date-format")),
        })}
      </p>

      {/* TL;DR Section */}
      <section className="mt-6 p-4 bg-container dark:bg-dark-container border-2 border-black dark:border-dark-border rounded-lg">
        <h2 className="text-2xl mb-2">{t("tldr.title")}</h2>
        <ul className="list-disc list-inside space-y-2">
          <li className="text-justify">{t("tldr.minimal-data")}</li>
          <li className="text-justify">{t("tldr.guest-data")}</li>
          <li className="text-justify">{t("tldr.personal-data")}</li>
          <li className="text-justify">{t("tldr.chat-storage")}</li>
          <li className="text-justify">{t("tldr.privacy-compliance")}</li>
          <li className="text-justify">{t("tldr.data-rights")}</li>
          <li className="text-justify">
            {t.rich("tldr.contact", {
              email: RichEmail,
            })}
          </li>
        </ul>
      </section>

      <RenderSection section="operator" />
      <RenderSection section="data-collection" />
      <RenderSection section="data-usage" />
      <RenderSection section="data-retention" />
      <RenderSection section="legal-basis" />
      <RenderSection section="data-access" />
      <RenderSection section="your-rights" />
      <RenderSection section="security" />
      <RenderSection section="cookies-analytics" />
      <RenderSection section="contact" />
    </div>
  )
}

interface RenderSectionProps {
  section:
    | "operator"
    | "data-collection"
    | "data-usage"
    | "data-retention"
    | "legal-basis"
    | "data-access"
    | "your-rights"
    | "security"
    | "cookies-analytics"
    | "contact"
}

const RenderSection = ({ section }: RenderSectionProps) => {
  const tr = useTranslations(`pages.PrivacyPolicy.content.${section}`)

  return (
    <section className="mt-8">
      <h2 className="text-2xl mb-4">{tr("title")}</h2>

      {section !== "contact" && tr.has("description") && (
        <p className="text-justify mb-4">{tr("description")}</p>
      )}

      {section === "contact" && tr.has("description") && (
        <p className="text-justify mb-4">
          {tr.rich("description", {
            email: RichEmail,
          })}
        </p>
      )}

      {tr.has("operator-info") && (
        <div className="mb-4">
          <p className="text-justify">
            {tr("operator-info")} {tr("operator-name")}
          </p>
          <p className="text-justify">
            <a
              href={`mailto:${process.env.EMAIL_CONTACT}`}
              className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
            >
              {process.env.EMAIL_CONTACT}
            </a>
          </p>
          <p className="text-justify">{tr("operator-type")}</p>
        </div>
      )}

      {/* Guest Players subsection */}
      {tr.has("guest-players.title") && (
        <div className="mb-6">
          <h3 className="text-xl mb-2">{tr("guest-players.title")}</h3>
          <ul className="list-disc list-inside space-y-1">
            {tr("guest-players.items")
              .split(";;")
              .map((item, index) => (
                <li key={index} className="text-justify">
                  {item}
                </li>
              ))}
          </ul>
          {tr.has("guest-players.note") && (
            <p className="text-justify mt-2 italic">
              {tr("guest-players.note")}
            </p>
          )}
        </div>
      )}

      {/* Logged-in Users subsection */}
      {tr.has("logged-users.title") && (
        <div className="mb-6">
          <h3 className="text-xl mb-2">{tr("logged-users.title")}</h3>
          <ul className="list-disc list-inside space-y-1">
            {tr("logged-users.items")
              .split(";;")
              .map((item, index) => (
                <li key={index} className="text-justify">
                  {item}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* General data subsection */}
      {tr.has("general.title") && (
        <div className="mb-6">
          <h3 className="text-xl mb-2">{tr("general.title")}</h3>
          <ul className="list-disc list-inside space-y-1">
            {tr("general.items")
              .split(";;")
              .map((item, index) => (
                <li key={index} className="text-justify">
                  {item}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Data retention table */}
      {tr.has("retention-table.headers") && (
        <div className="mb-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-black dark:border-dark-border rounded-sm">
              <thead>
                <tr className="bg-button dark:bg-dark-container">
                  {tr("retention-table.headers")
                    .split(";;")
                    .map((header, index) => (
                      <th
                        key={index}
                        className="border-2 border-black dark:border-dark-border p-2 text-left"
                      >
                        {header}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {tr("retention-table.rows")
                  .split("|||")
                  .map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={
                        rowIndex % 2 === 0
                          ? "bg-container dark:bg-dark-container"
                          : ""
                      }
                    >
                      {row.split(";;").map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="border-2 border-black dark:border-dark-border p-2"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Regular items list */}
      {tr.has("items") && (
        <ul className="list-disc list-inside space-y-1">
          {tr("items")
            .split(";;")
            .map((item, index) => (
              <li key={index} className="text-justify">
                {item}
              </li>
            ))}
        </ul>
      )}
    </section>
  )
}

export default PrivacyPolicyPage
