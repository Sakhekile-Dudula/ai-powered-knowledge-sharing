"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "./utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-700",
        "data-[state=unchecked]:bg-slate-800 data-[state=unchecked]:border-slate-900",
        "dark:data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:border-slate-400",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block h-6 w-6 rounded-full shadow-xl transition-transform border-2",
          "bg-white border-white",
          "dark:bg-slate-900 dark:border-slate-900",
          "data-[state=checked]:translate-x-5",
          "data-[state=unchecked]:translate-x-0",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
