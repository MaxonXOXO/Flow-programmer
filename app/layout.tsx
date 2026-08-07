import type { Metadata } from 'next'
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import './globals.css'


const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Flow-IDE — Embedded Visual Programming Environment',
  description: 'Universal Embedded Visual Programming & Compiler Infrastructure',
  icons: {
    icon: '/flowide.ico',
    shortcut: '/flowide.ico',
    apple: '/flowide.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${jetbrains.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}