import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ToastContainer from "@/components/Toast";

export const metadata: Metadata = {
  title: "Zota — Solana Asset Parser",
  description: "Intelligent Solana asset parsing, holder tracking, and tokenization platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
        <ToastContainer />
      </body>
    </html>
  );
}
