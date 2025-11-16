"use client"

import NextError from "next/error"
import posthog from "posthog-js"
import { useEffect } from "react"

interface GlobalErrorProps {
  error: Error & { digest?: string }
}
export default function GlobalError({ error }: Readonly<GlobalErrorProps>) {
  useEffect(() => {
    posthog.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        {/* `NextError` is the default Next.js error page component. Its type
        definition requires a `statusCode` prop. However, since the App Router
        does not expose status codes for errors, we simply pass 0 to render a
        generic error message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  )
}
