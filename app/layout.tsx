import type { Metadata } from "next";
import { AuthProvider } from "@/app/_contexts/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaxBee",
  description: "Guided income tax filing workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
