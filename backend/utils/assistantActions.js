import { TAXBEE_SITE_MAP, STORAGE_KEYS } from "./siteMap.js";
import { tokenize, calculateScore } from "./nlp.js";

const ROUTE_ACTIONS = [
  {
    route: "/file-your-itr",
    label: "Open ITR filing",
    terms: ["file itr", "itr filing", "tax return", "submit return", "declare income"],
  },
  {
    route: "/import-data",
    label: "Open taxpayer verification",
    terms: ["verify pan", "verify taxpayer", "taxpayer details", "import data", "pan details"],
  },
  {
    route: "/file-tax",
    label: "Open income overview",
    terms: ["income overview", "income heads", "select income", "income details"],
  },
  {
    route: "/deductions",
    label: "Open deductions",
    terms: ["deduction", "80c", "80d", "lic", "health insurance", "home loan"],
  },
  {
    route: "/upload-documents",
    label: "Open document upload",
    terms: ["upload", "document", "form 16", "proof", "attach"],
  },
  {
    route: "/tax-savings",
    label: "Open tax savings",
    terms: ["tax saving", "save tax", "reduce tax", "investment option"],
  },
  {
    route: "/dashboard",
    label: "Open dashboard",
    terms: ["dashboard", "home", "overview"],
  },
  {
    route: "/help",
    label: "Open help",
    terms: ["help", "support", "faq", "stuck"],
  },
];

const getSiteMapRouteAction = (message = "") => {
  const queryTokens = tokenize(message);
  if (queryTokens.length === 0) return null;

  const scoredPages = TAXBEE_SITE_MAP.map((page) => {
    const targetKeywords = [
      page.title,
      ...page.tasks,
      ...page.keywords,
    ];

    const score = calculateScore(queryTokens, targetKeywords, ["80c", "itr", "pan", "salary"]);

    return { page, score };
  }).sort((a, b) => b.score - a.score);

  const best = scoredPages[0];
  if (!best || best.score < 2) return null;

  return {
    type: "navigate",
    route: best.page.route,
    label: `Open ${best.page.title}`,
  };
};

const getRouteAction = (message = "") => {
  const normalized = message.toLowerCase();
  const route = ROUTE_ACTIONS.find((item) =>
    item.terms.some((term) => normalized.includes(term))
  );

  if (!route) return getSiteMapRouteAction(message);

  return {
    type: "navigate",
    route: route.route,
    label: route.label,
  };
};

const getValidationAction = (analysis) => {
  const issues = [...analysis.missingFields, ...analysis.warnings];
  if (issues.length === 0) return null;

  return {
    type: "validation_summary",
    label: "Review issues",
    issues: issues.slice(0, 8),
  };
};

const parseAmount = (message = "") => {
  const normalized = message.toLowerCase().replace(/,/g, "");
  const matches = [
    ...normalized.matchAll(/(?:rs\.?|₹|inr)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|k)?/g),
  ];
  const amountMatch = matches[matches.length - 1];
  if (!amountMatch) return null;

  const base = parseFloat(amountMatch[1]);
  if (!Number.isFinite(base)) return null;

  const multiplier =
    amountMatch[2] === "lakh" || amountMatch[2] === "lac"
      ? 100000
      : amountMatch[2] === "k"
        ? 1000
        : 1;

  return String(Math.round(base * multiplier));
};

/**
 * Determines if a message intends to update a specific tax value.
 * Extracts the amount and maps it to the correct storage key and path.
 */
const getStorageUpdateAction = (message = "") => {
  const normalized = message.toLowerCase();
  const amount = parseAmount(message);
  if (!amount) return null;

  if (normalized.includes("80c") || normalized.includes("lic") || normalized.includes("ppf") || normalized.includes("elss")) {
    return {
      type: "set_local_storage",
      key: STORAGE_KEYS.DEDUCTIONS,
      path: "section80C",
      value: amount,
      label: `Set 80C to Rs. ${amount}`,
      route: "/deductions",
    };
  }

  if (normalized.includes("80d") || normalized.includes("health insurance") || normalized.includes("medical insurance")) {
    return {
      type: "set_local_storage",
      key: STORAGE_KEYS.DEDUCTIONS,
      path: "healthInsurance",
      value: amount,
      label: `Set health insurance to Rs. ${amount}`,
      route: "/deductions",
    };
  }

  if (normalized.includes("home loan") || normalized.includes("housing loan")) {
    return {
      type: "set_local_storage",
      key: STORAGE_KEYS.DEDUCTIONS,
      path: "homeLoanInterest",
      value: amount,
      label: `Set home loan interest to Rs. ${amount}`,
      route: "/deductions",
    };
  }

  if (normalized.includes("perquisite")) {
    return {
      type: "set_local_storage",
      key: STORAGE_KEYS.ITR_DRAFT,
      path: "salary.perquisites17_2",
      value: amount,
      label: `Set perquisites u/s 17(2) to Rs. ${amount}`,
      route: "/file-your-itr",
    };
  }

  if (normalized.includes("profit in lieu") || normalized.includes("profits in lieu")) {
    return {
      type: "set_local_storage",
      key: STORAGE_KEYS.ITR_DRAFT,
      path: "salary.profits17_3",
      value: amount,
      label: `Set profits in lieu of salary to Rs. ${amount}`,
      route: "/file-your-itr",
    };
  }

  if (normalized.includes("exemption") || normalized.includes("hra")) {
    return {
      type: "set_local_storage",
      key: STORAGE_KEYS.ITR_DRAFT,
      path: "salary.exemptions10",
      value: amount,
      label: `Set exemptions u/s 10 to Rs. ${amount}`,
      route: "/file-your-itr",
    };
  }

  if (normalized.includes("standard deduction") || normalized.includes("professional tax") || normalized.includes("deduction u/s 16") || normalized.includes("deductions u/s 16")) {
    return {
      type: "set_local_storage",
      key: STORAGE_KEYS.ITR_DRAFT,
      path: "salary.deductions16",
      value: amount,
      label: `Set deductions u/s 16 to Rs. ${amount}`,
      route: "/file-your-itr",
    };
  }

  if (normalized.includes("salary") || normalized.includes("income from salary")) {
    return {
      type: "set_local_storage",
      key: STORAGE_KEYS.ITR_DRAFT,
      path: "salary.salary17_1",
      value: amount,
      label: `Set salary u/s 17(1) to Rs. ${amount}`,
      route: "/file-your-itr",
    };
  }

  return null;
};

export const buildAssistantActions = ({ message, taxAnalysis }) => {
  const actions = [];
  const storageAction = getStorageUpdateAction(message);
  const routeAction = storageAction ? null : getRouteAction(message);
  const validationAction = getValidationAction(taxAnalysis);

  if (storageAction) actions.push(storageAction);
  if (routeAction) actions.push(routeAction);
  if (validationAction) actions.push(validationAction);

  return actions;
};
