import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { getUser, isSupabaseConfigured } from "@/lib/supabase/server";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });

// Every page depends on the signed-in user, so never serve a cached copy.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lock In",
  description: "Turn your notes and slides into quizzes and games, and get help with homework.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = isSupabaseConfigured() ? (await getUser()).user : null;

  return (
    <html lang="en">
      <body className={`${jakarta.variable} min-h-screen font-sans antialiased`}>
        <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-3 sm:gap-3">
            <Link href={user ? "/dashboard" : "/"} className="mr-auto text-xl font-extrabold tracking-tight">
              🔒 Lock <span className="text-accent">In</span>
            </Link>
            {user ? (
              <>
                <Link href="/sets/new" className="rounded-lg px-2.5 py-1.5 text-sm font-semibold hover:bg-surface-2">
                  + Study set
                </Link>
                <Link href="/homework" className="rounded-lg px-2.5 py-1.5 text-sm font-semibold hover:bg-surface-2">
                  Homework
                </Link>
                <form action="/auth/signout" method="post">
                  <button className="rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-surface-2">Sign out</button>
                </form>
              </>
            ) : (
              <Link href="/login" className="btn btn-primary py-1.5 text-sm">
                Sign in
              </Link>
            )}
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">{children}</main>
      </body>
    </html>
  );
}
