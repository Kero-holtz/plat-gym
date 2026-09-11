import type { Metadata, Viewport } from "next"
import "@fontsource-variable/manrope"
import "@fontsource/barlow-condensed/600.css"
import "@fontsource/barlow-condensed/700.css"
import "./globals.css"
import { Toaster } from "@/components/ui/toast"

export const metadata: Metadata = {
  title: {
    default: "PLAT GYM",
    template: "%s · PLAT GYM",
  },
  description: "Member, visit, personal training, and payment operations for PLAT GYM.",
  applicationName: "PLAT GYM",
  manifest: "/manifest.webmanifest",
  icons: [{ rel: "icon", url: "/icon.svg", type: "image/svg+xml" }],
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#191c22",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <Toaster>{children}</Toaster>
      </body>
    </html>
  )
}
