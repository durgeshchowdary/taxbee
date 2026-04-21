import type { Guide } from "@/components/BeeAssistant";

export const GUIDES: Guide[] = [
  {
    id: "file-itr",
    title: "File ITR",
    doneMessage:
      "Your guided ITR flow is complete. Before final filing, verify Form 16, AIS/Form 26AS, bank details, deductions, and regime choice.",
    intents: [
      "file itr",
      "file my itr",
      "start itr",
      "itr filing",
      "file tax",
      "start filing",
      "help me file",
    ],
    intentGroups: [
      ["itr", "return", "tax return", "filing", "file", "submit"],
      ["start", "begin", "new", "continue", "complete", "finish"],
      ["salary", "income", "form 16", "ais"],
    ],
    steps: [
      {
        id: "import-data",
        label: "Import or verify taxpayer data",
        route: "/import-data",
        instruction:
          "First, verify your PAN/user details so the draft belongs to the right taxpayer.",
      },
      {
        id: "income",
        label: "Declare income",
        route: "/file-your-itr",
        instruction:
          "Enter salary details from Form 16. Save the draft when you finish this section.",
      },
      {
        id: "deductions",
        label: "Claim deductions",
        route: "/deductions",
        instruction:
          "Enter eligible deductions like 80C, 80D, and home loan interest if they apply.",
      },
      {
        id: "review",
        label: "Review and compare",
        route: "/file-your-itr",
        instruction:
          "Review missing fields, compare old vs new regime, and verify with Form 16/AIS before filing.",
      },
    ],
  },
  {
    id: "deductions",
    title: "Claim Deductions",
    doneMessage:
      "Deduction guide complete. Keep proofs ready and verify whether old or new regime is better.",
    intents: ["deduction", "80c", "80d", "tax saving", "save tax", "claim deduction"],
    intentGroups: [
      ["deduction", "deductions", "claim", "section"],
      ["80c", "80d", "lic", "ppf", "elss", "insurance", "home loan"],
      ["save tax", "reduce tax", "tax saving"],
    ],
    steps: [
      {
        id: "open-deductions",
        label: "Open deductions",
        route: "/deductions",
        instruction: "Open the deductions page and enter the amounts that apply to you.",
      },
      {
        id: "review-deductions",
        label: "Review deduction proofs",
        route: "/deductions",
        instruction:
          "Check proof for 80C, 80D, and home loan interest. Then ask me to compare regimes.",
      },
    ],
  },
  {
    id: "documents",
    title: "Upload Documents",
    doneMessage:
      "Document guide complete. Keep Form 16, AIS/Form 26AS, bank details, and deduction proofs ready for review.",
    intents: ["upload document", "documents", "form 16 upload", "upload proof", "upload files"],
    intentGroups: [
      ["document", "documents", "proof", "file", "files", "paper"],
      ["upload", "add", "attach", "submit", "show"],
      ["form 16", "ais", "26as", "certificate"],
    ],
    steps: [
      {
        id: "open-upload",
        label: "Open upload documents",
        route: "/upload-documents",
        instruction:
          "Upload or organize documents like Form 16, AIS/Form 26AS, interest certificates, and deduction proofs.",
      },
      {
        id: "review-documents",
        label: "Review documents",
        route: "/documents",
        instruction:
          "Review uploaded/available documents and confirm nothing important is missing.",
      },
    ],
  },
  {
    id: "tax-savings",
    title: "Tax Savings",
    doneMessage:
      "Tax savings guide complete. Use the suggestions only if you have eligible proof and the chosen regime allows them.",
    intents: ["tax savings", "save money", "reduce tax", "saving options", "investment options"],
    intentGroups: [
      ["saving", "savings", "save", "reduce", "lower"],
      ["tax", "money", "investment", "options"],
      ["80c", "80d", "deduction"],
    ],
    steps: [
      {
        id: "open-savings",
        label: "Open tax savings",
        route: "/tax-savings",
        instruction: "Review suggested tax-saving options and note which ones apply to you.",
      },
      {
        id: "enter-deductions",
        label: "Enter eligible deductions",
        route: "/deductions",
        instruction:
          "Enter eligible deduction amounts, then compare old vs new regime before deciding.",
      },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    doneMessage: "Dashboard guide complete. You can start filing, check savings, or review activity from here.",
    intents: ["dashboard", "home page", "main page", "go home"],
    intentGroups: [
      ["dashboard", "home", "main", "overview"],
      ["go", "open", "take", "show"],
    ],
    steps: [
      {
        id: "open-dashboard",
        label: "Open dashboard",
        route: "/dashboard",
        instruction:
          "This is your main TaxBee workspace. Use it to start filing, view summaries, and access tools.",
      },
    ],
  },
  {
    id: "help",
    title: "Help",
    doneMessage: "Help guide complete. You can ask me a follow-up anytime.",
    intents: ["help page", "support", "faq", "questions", "how to use"],
    intentGroups: [
      ["help", "support", "faq", "question", "issue", "stuck"],
      ["how", "where", "what"],
    ],
    steps: [
      {
        id: "open-help",
        label: "Open help",
        route: "/help",
        instruction:
          "Open the Help page for common questions. You can also ask me directly in chat.",
      },
    ],
  },
];

export const HIGH_VALUE_TAX_TERMS = ["80c", "80d", "pan", "itr", "salary", "regime", "deduction", "form 16", "ais", "26as"];