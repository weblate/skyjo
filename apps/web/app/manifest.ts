import type { MetadataRoute } from "next"

type ClientMode =
  | "auto"
  | "focus-existing"
  | "navigate-existing"
  | "navigate-new"

type Manifest = MetadataRoute.Manifest & {
  handle_links?: "auto" | "preferred" | "not-preferred"
  launch_handler?: {
    client_mode: ClientMode | Array<ClientMode>
  }
  iarc_rating_id?: string
  scope_extensions?: Array<{ origin: string }>
  edge_side_panel?: {
    preferred_width: number
  }
}

export default function manifest(): Manifest {
  return {
    name: "Skymo | Play Skyjo Card Game Online Free",
    short_name: "Skymo",
    description:
      "Play Skyjo online for free with Skymo! A fast-paced multiplayer card game where strategy meets fun. Challenge friends, flip cards, and aim for the lowest score to win!",
    start_url: "/",
    orientation: "portrait",
    display: "standalone",
    display_override: ["window-controls-overlay"],
    background_color: "#fefdf7",
    theme_color: "#fefdf7",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    dir: "ltr",
    lang: "en",
    categories: ["entertainment", "games", "social"],
    prefer_related_applications: false,
    handle_links: "preferred",
    scope_extensions: [
      {
        origin: "https://www.skyjo.online",
      },
    ],
    launch_handler: {
      client_mode: "auto",
    },
    edge_side_panel: {
      preferred_width: 400,
    },
    shortcuts: [
      {
        name: "Search public Skymo games",
        url: "/search",
        description: "Search for public Skymo games to join",
      },
      {
        name: "Create a private Skymo game",
        url: "/create?private=true",
        description: "Create a private Skymo game to play with friends",
      },
      {
        name: "Create a public Skymo game",
        url: "/create?private=false",
        description: "Create a public Skymo game to play with anyone",
      },
    ],
  }
}
