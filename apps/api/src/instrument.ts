import * as Sentry from "@sentry/node"
import { nodeProfilingIntegration } from "@sentry/profiling-node"

Sentry.init({
  dsn: "https://400c80cd3be6510c63079aac351ba2ca@o4508749759315968.ingest.de.sentry.io/4509017600229456",
  integrations: [nodeProfilingIntegration()],
  release: `api@${process.env.npm_package_version}`,

  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
})

Sentry.profiler.startProfiler()
