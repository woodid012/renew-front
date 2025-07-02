// app/layout.jsx
import './globals.css'

export const metadata = {
  title: 'RenewableAssets - Portfolio Analysis Platform',
  description: 'Renewable energy portfolio analysis and management platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}