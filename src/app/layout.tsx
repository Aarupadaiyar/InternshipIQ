import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'InternshipIQ — Career Intelligence for Students',
  description: 'AI-powered internship matching. Find roles that fit your skills, understand your gaps, and accelerate your career.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
