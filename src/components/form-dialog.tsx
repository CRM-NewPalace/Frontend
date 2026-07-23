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
      <DialogContent className={cn("sm:max-w-xl p-0 gap-0 overflow-hidden", className)}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div className="space-y-1 pr-6 min-w-0">
              <DialogTitle className="text-lg tracking-tight">{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </div>
          </div>
        </DialogHeader>
        <div className={cn("flex flex-col max-h-[min(78vh,720px)]", contentClassName)}>
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
    <div className={cn("overflow-y-auto px-6 py-5 space-y-5", className)}>
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
    <DialogFooter className={cn("px-6 py-4 border-t bg-muted/30 sm:justify-between gap-3", className)}>
      {hint ? (
        <p className="text-xs text-muted-foreground hidden sm:block">{hint}</p>
      ) : (
        <span className="hidden sm:block" />
      )}
      <div className="flex items-center gap-2 w-full sm:w-auto">{children}</div>
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
