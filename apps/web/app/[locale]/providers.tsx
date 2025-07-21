"use client"

import { Locales } from "@skymo/shared/constants"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { domAnimation, LazyMotion } from "motion/react"
import posthog from "posthog-js"
import { PostHogProvider } from "posthog-js/react"
import { useEffect } from "react"
import { Toaster } from "sonner"
import FeedbackProvider from "@/contexts/FeedbackContext"
import PlayerProvider from "@/contexts/PlayerContext"
import RulesProvider from "@/contexts/RulesContext"
import SettingsProvider from "@/contexts/SettingsContext"
import PostHogPageView from "./PostHogPageView"

const queryClient = new QueryClient()

interface ProvidersProps {
  children: React.ReactNode
  locale: Locales
}
const Providers = ({ children, locale }: ProvidersProps) => {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
      api_host: "/relay-913U",
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: "identified_only",
      persistence: "memory",
      capture_pageview: false,
      capture_pageleave: true,
      opt_in_site_apps: true,
      enable_heatmaps: false,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      rate_limiting: {
        events_per_second: 5,
      },
    })
  }, [])

  return (
    <PostHogProvider client={posthog}>
      <PostHogPageView />
      <QueryClientProvider client={queryClient}>
        <FeedbackProvider>
          <RulesProvider>
            <SettingsProvider locale={locale}>
              <PlayerProvider>
                <LazyMotion strict features={domAnimation}>
                  {children}
                </LazyMotion>
              </PlayerProvider>
            </SettingsProvider>
          </RulesProvider>
          <Toaster
            toastOptions={{
              closeButton: true,
              classNames: {
                closeButton:
                  "bg-none! border-none! text-black! dark:text-dark-font! absolute! left-auto! top-2! right-[-5px]! dark:bg-dark-body!",
                toast:
                  "border-2! border-black! dark:border-dark-border! bg-white! dark:bg-dark-body!",
                title:
                  "text-sm! font-semibold! text-black! dark:text-dark-font!",
                description:
                  "text-sm! opacity-90! text-black! dark:text-dark-font!",
                icon: "text-black! dark:text-dark-font!",
              },
            }}
            icons={{
              success: null,
              error: null,
              loading: null,
              info: null,
              warning: null,
            }}
            position="bottom-right"
          />
        </FeedbackProvider>
      </QueryClientProvider>
    </PostHogProvider>
  )
}

export default Providers
