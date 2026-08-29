import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TableRowActions({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center justify-end gap-0.5">{children}</div>
  );
}

export function RowIconButton({
  title,
  onClick,
  destructive,
  children,
  asChild,
}: {
  title: string;
  onClick?: () => void;
  destructive?: boolean;
  children: ReactNode;
  asChild?: boolean;
}) {
    return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", destructive && "text-destructive hover:text-destructive")}
      title={title}
      onClick={onClick}
      asChild={asChild}
      type={asChild ? undefined : "button"}
    >
      {children}
    </Button>
  );
}
