import type { ReactNode } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function FormDialogShell({
  open,
  onOpenChange,
  icon,
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[calc(100vw-1.5rem)] max-w-xl sm:w-full p-0 gap-0 overflow-hidden max-h-[90dvh] flex flex-col",
          className,
        )}
      >
        <DialogHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b bg-gradient-to-br from-primary/10 via-background to-background shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div className="space-y-1 pr-6 min-w-0">
              <DialogTitle className="text-base sm:text-lg tracking-tight">{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </div>
          </div>
        </DialogHeader>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            contentClassName,
          )}
        >
          {children}
        </div>
        {footer}
      </DialogContent>
    </Dialog>
  );
}

export function FormSection({
  icon,
  title,
  children,
  className,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-4 space-y-4 shadow-sm", className)}>
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

export function FormDialogBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-5 space-y-5 [scrollbar-gutter:stable]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FormDialogActions({
  children,
  hint,
  className,
}: {
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <DialogFooter className={cn("px-4 sm:px-6 py-3 sm:py-4 border-t bg-muted/30 sm:justify-between gap-3 shrink-0", className)}>
      {hint ? (
        <p className="text-xs text-muted-foreground hidden sm:block">{hint}</p>
      ) : (
        <span className="hidden sm:block" />
      )}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto [&_button]:w-full sm:[&_button]:w-auto">
        {children}
      </div>
    </DialogFooter>
  );
}

export function DetailField({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium break-words">{value || "—"}</div>
    </div>
  );
}
