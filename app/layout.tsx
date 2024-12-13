import './globals.css'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { LogoutButton } from '../src/components/logout-button'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'LENGOLF Forms',
  description: 'Create packages for LENGOLF customers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <LogoutButton />
          {children}
        </Providers>
      </body>
    </html>
  )
}