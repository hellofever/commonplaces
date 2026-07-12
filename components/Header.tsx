"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { href: "/", label: "Map" },
  { href: "/list", label: "List" },
  { href: "/sheet", label: "Sheet" },
];

export function Header({ onAdd }: { onAdd: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  function handleSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-black/10 bg-white/90 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-black/80">
      <input
        type="search"
        value={q}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search restaurants…"
        className="min-w-0 flex-1 rounded-full border border-black/10 bg-black/[.03] px-4 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-white/[.06] dark:focus:border-white/30"
      />
      <nav className="flex rounded-full border border-black/10 p-0.5 text-sm dark:border-white/10">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={q ? `${tab.href}?q=${encodeURIComponent(q)}` : tab.href}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                active
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-black/60 dark:text-white/60"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={onAdd}
        className="rounded-full bg-[#bd5a1f] px-4 py-2 text-sm font-medium text-white"
      >
        + Add
      </button>
    </header>
  );
}
