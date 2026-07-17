import { cva } from "class-variance-authority"

export const panelVariants = cva("rounded-xl border", {
  variants: {
    tone: {
      subtle: "bg-stone-950/40 border-stone-800/60",
      default: "bg-stone-950/60 border-stone-800",
      strong: "bg-stone-800/60 border-stone-700/50",
    },
  },
  defaultVariants: {
    tone: "default",
  },
})
