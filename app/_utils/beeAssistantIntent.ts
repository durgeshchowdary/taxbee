export type BeeAssistantIntent =
  | "greeting"
  | "small_talk"
  | "emotional_support"
  | "confusion"
  | "stress"
  | "gratitude"
  | "capabilities"
  | "filing_help"
  | "continue_filing"
  | "upload_help"
  | "deduction_help"
  | "regime_help"
  | "dashboard_help"
  | "workflow_trigger"
  | "fallback";

export type BeeAssistantIntentRoute = {
  intent: BeeAssistantIntent;
  handling: "local" | "workflow" | "tax_intelligence";
};

const matches = (text: string, pattern: RegExp) => pattern.test(text);

export const classifyBeeAssistantIntent = (message = ""): BeeAssistantIntent => {
  const text = message.toLowerCase().trim();
  if (!text) return "fallback";

  if (matches(text, /^(hi|hey|hello|yo|namaste|good morning|good afternoon|good evening)\b/)) {
    return "greeting";
  }

  if (matches(text, /\b(thanks|thank you|appreciate it|that helped|helped a lot)\b/)) {
    return "gratitude";
  }

  if (matches(text, /\b(how are you|how's it going|how are things|what's up|doing okay|doing well|cool|nice|great|awesome|love it|perfect|haha|lol)\b/)) {
    return "small_talk";
  }

  if (matches(text, /\b(confused|confusing|lost|don't understand|dont understand|not sure|unclear|where do i start)\b/)) {
    return "confusion";
  }

  if (matches(text, /\b(stress|stressed|anxious|anxiety|worried|panic|scared|overwhelmed|tension)\b/)) {
    return "stress";
  }

  if (matches(text, /\b(frustrated|annoyed|irritated|angry|stuck|fed up|not working|sad|tired|afraid|nervous|alone|mistake|wrong|messed up|incorrect)\b/)) {
    return "emotional_support";
  }

  if (matches(text, /\b(what can you do|capabilities|how can you help|who are you)\b/)) {
    return "capabilities";
  }

  if (matches(text, /\b(continue filing|continue my draft|resume filing|resume my draft|what should i do next|next step|do next|filing stage)\b/)) {
    return "continue_filing";
  }

  if (matches(text, /\b(upload|form 16|document|documents|pdf|ais|26as|form 26as)\b/)) {
    return "upload_help";
  }

  if (matches(text, /\b(deduction|deductions|80c|80d|hra|home loan|section|tax saving|save tax)\b/)) {
    return "deduction_help";
  }

  if (matches(text, /\b(regime|old regime|new regime|compare tax|compare regimes|tax regime)\b/)) {
    return "regime_help";
  }

  if (matches(text, /\b(review filing risks|filing risks|risk review|find filing risks|run filing review|validate filing)\b/)) {
    return "workflow_trigger";
  }

  if (matches(text, /\b(dashboard|summary|overview|status)\b/)) {
    return "dashboard_help";
  }

  if (matches(text, /\b(start filing|help me file|help me start|file my itr|start my itr|begin filing|file taxes|file tax)\b/)) {
    return "filing_help";
  }

  return "fallback";
};

export const isLocalBeeAssistantIntent = (intent: BeeAssistantIntent) =>
  [
    "greeting",
    "small_talk",
    "emotional_support",
    "confusion",
    "stress",
    "gratitude",
    "capabilities",
  ].includes(intent);

export const isWorkflowBeeAssistantIntent = (intent: BeeAssistantIntent) =>
  [
    "filing_help",
    "continue_filing",
    "upload_help",
    "dashboard_help",
    "workflow_trigger",
  ].includes(intent);

export const isTaxIntelligenceBeeAssistantIntent = (intent: BeeAssistantIntent) =>
  intent === "deduction_help" || intent === "regime_help" || intent === "fallback";

export const routeBeeAssistantIntent = (message = ""): BeeAssistantIntentRoute => {
  const intent = classifyBeeAssistantIntent(message);

  if (isLocalBeeAssistantIntent(intent)) {
    return { intent, handling: "local" };
  }

  if (isWorkflowBeeAssistantIntent(intent)) {
    return { intent, handling: "workflow" };
  }

  return { intent, handling: "tax_intelligence" };
};
