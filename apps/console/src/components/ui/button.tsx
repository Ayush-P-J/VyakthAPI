import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center font-semibold transition-colors cursor-pointer focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-margin disabled:opacity-55 disabled:cursor-default",
  {
    variants: {
      variant: {
        primary: "bg-bank text-white hover:bg-bank-deep",
        rail: "text-rail-quiet hover:text-white underline-offset-4 hover:underline",
      },
      size: { default: "px-5 py-2.5", small: "text-sm" },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export function Button({ className, variant, size, asChild, ...props }: React.ComponentProps<"button"> & VariantProps<typeof button> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(button({ variant, size }), className)} {...props} />;
}
