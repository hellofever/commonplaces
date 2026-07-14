"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

// Thin wrapper over shadcn's Sheet so callers keep the pre-shadcn open/onClose API.
// Bottom sheet on mobile; on sm+ it becomes a vertically centered modal via
// inset-0 + m-auto + h-fit (no translate centering, which would fight the slide-in
// animation's transforms). The `!` overrides are needed because SheetContent's own
// data-[side=bottom] positioning utilities would otherwise win the cascade.
export function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] gap-0 overflow-y-auto rounded-t-2xl p-5 sm:inset-0! sm:m-auto! sm:h-fit! sm:w-full sm:max-w-md sm:rounded-2xl"
      >
        <SheetTitle className="sr-only">Panel</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
