import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer grid h-4 w-4 shrink-0 place-content-center rounded-[5px] border border-brand-dark/20 bg-white shadow-none transition-colors cursor-pointer",
      "hover:border-[#079ED4]/55 hover:bg-[#079ED4]/5",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#079ED4]/30",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:border-transparent data-[state=checked]:bg-[#079ED4] data-[state=checked]:text-white data-[state=checked]:hover:bg-[#068fc0]",
      "data-[state=indeterminate]:border-transparent data-[state=indeterminate]:bg-[#079ED4] data-[state=indeterminate]:text-white",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("grid place-content-center text-current")}
    >
      <Check className="h-3 w-3 stroke-[2.5]" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
