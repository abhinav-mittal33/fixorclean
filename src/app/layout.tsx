import './globals.css'

export const metadata = {
  title: 'FixOrClean — Survey Intelligence Platform',
  description: 'Turn messy survey data into clean, analysed, presentation-ready reports in minutes. Zero data skills required.',
  keywords: ['survey', 'data cleaning', 'analytics', 'FixOrClean', 'India', 'report'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Syne:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
