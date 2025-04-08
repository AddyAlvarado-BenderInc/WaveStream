import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "./providers";
import { Provider } from "react-redux";
import store from "@/store/store";
import AuthProvider from "./auth";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Product Management Application",
  description: "Efficiently manage your product managers and products",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  const isLoginPage = pathname === "/login";

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>
          <Provider store={store}>
          {isLoginPage ? children : <AuthProvider>{children}</AuthProvider>}
          </Provider>
        </Providers>
      </body>
    </html>
  );
}