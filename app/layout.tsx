import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/sideBar";

export const metadata: Metadata = {
  title: "Path Finder",
  description: "Správa indoor–outdoor navigačného systému pre komplex budov.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      <body className="antialiased bg-paper text-ink">
        <div className="flex min-h-[100dvh] w-full">
          <Sidebar />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
