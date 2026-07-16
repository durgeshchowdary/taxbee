export type BeeEmotion = "empathetic" | "cheerful" | "neutral" | "serious";

export const getEmotionStyles = (emotion: BeeEmotion = "neutral") => {
  const base =
    "backdrop-blur-md border border-white/20 shadow-xl transition-all duration-500";

  const variants: Record<BeeEmotion, string> = {
    empathetic: "bg-gradient-to-br from-blue-50/40 to-indigo-100/40 text-blue-950",
    cheerful: "bg-gradient-to-br from-amber-50/40 to-orange-100/40 text-orange-950",
    serious: "bg-gradient-to-br from-slate-50/50 to-gray-200/50 text-slate-950",
    neutral: "bg-white/70 text-slate-800",
  };

  return {
    container: `${base} ${variants[emotion] ?? variants.neutral}`,
    bubble: emotion === "cheerful" ? "animate-pulse" : "",
  };
};

export default getEmotionStyles;