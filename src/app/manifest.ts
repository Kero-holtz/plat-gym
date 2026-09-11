import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PLAT GYM Operations",
    short_name: "PLAT GYM",
    description: "Gym member, visit, booking, and payment management.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5f4f0",
    theme_color: "#191c22",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  }
}
