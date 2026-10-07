import "./globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import AuthProvider from "@/components/AuthProvider";
import DateFormatOverride from "@/components/DateFormatOverride";

const inter = Inter({ subsets: ["latin"] });
const down = true;

export const metadata = {
  title: "DKJU - Smart Islamic Education",
  description:
    "DKJU ERP Portal for Student Admission and Management - Smart Islamic Education System",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DKJU",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "DKJU",
    "application-name": "DKJU",
    "msapplication-TileColor": "#0d9488",
    "msapplication-config": "/browserconfig.xml",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d9488",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" sizes="any" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0d9488" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="DKJU" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="DKJU" />
        <meta name="msapplication-TileColor" content="#0d9488" />
        <meta name="msapplication-TileImage" content="/logo.png" />
      </head>

      <body className={inter.className}>
        {down ? (
          "Website Down"
        ) : (
          <>
            <DateFormatOverride />
            <AuthProvider>{children}</AuthProvider>
            <Toaster position="top-right" richColors />
          </>
        )}
      </body>
    </html>
  );
}
