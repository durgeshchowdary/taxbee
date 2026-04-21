const normalize = (value = "") => value.toLowerCase();

const KNOWLEDGE_BASE = [
  {
    id: "form16",
    title: "Form 16",
    keywords: ["form 16", "salary certificate", "tds certificate", "salary tds"],
    facts: [
      "Form 16 is the salary TDS certificate issued by an employer.",
      "Use it to verify salary income, deductions reported by employer, and TDS deducted.",
      "Amounts in the app should be cross-checked with Form 16 before filing.",
    ],
    source: "https://www.incometax.gov.in/iec/foportal/newformpage/form16",
  },
  {
    id: "ais",
    title: "Annual Information Statement (AIS)",
    keywords: ["ais", "annual information statement", "tis", "26as", "form 26as"],
    facts: [
      "AIS gives a comprehensive view of taxpayer information before filing.",
      "AIS supports voluntary compliance and lets taxpayers review information shown for them.",
      "Use AIS/Form 26AS to verify TDS, interest, dividends, securities transactions, and other reported income.",
    ],
    source:
      "https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/ais-annual-information-statement",
  },
  {
    id: "80c",
    title: "Section 80C",
    keywords: ["80c", "section 80c", "ppf", "elss", "lic", "life insurance", "tuition", "principal repayment"],
    facts: [
      "Section 80C covers eligible payments such as life insurance premium, provident fund, certain equity-linked investments, tuition fees, NSC, and housing loan principal.",
      "The combined 80C/80CCC/80CCD(1) limit used in the app estimate is Rs. 1,50,000.",
      "For each eligible payment, the ITR may require supporting details such as policy/document identifier and eligible amount.",
    ],
    source:
      "https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-0?mobile-app=1%2Fe-Campaigns%2Fe-mail%2Fe-Campaigns%2Fe-mail",
  },
  {
    id: "80d",
    title: "Section 80D",
    keywords: ["80d", "section 80d", "health insurance", "medical insurance", "preventive health"],
    facts: [
      "Section 80D covers health insurance premium and preventive health check-up within specified limits.",
      "For self/spouse/dependent children, the common non-senior limit is Rs. 25,000; it can be Rs. 50,000 if any covered person is a senior citizen.",
      "The ITR may require insurer name, policy number, and health insurance amount.",
    ],
    source:
      "https://www.incometax.gov.in/iec/foportal/help/individual-business-profession?mobile-app=1%2Fe-Campaigns%2Fe-mail%2Fe-Campaigns%2Fe-mail",
  },
  {
    id: "house-property-loss",
    title: "House Property Loss Set-Off",
    keywords: ["house property", "home loan interest", "interest on loan", "loss from house property"],
    facts: [
      "Loss from house property set-off against other income is commonly capped at Rs. 2,00,000 for the assessment year, with balance carry-forward subject to rules.",
      "Home loan interest should be supported by lender certificate and property details.",
      "The app estimate uses a simplified Rs. 2,00,000 cap for home loan interest context.",
    ],
    source: "https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-3",
  },
  {
    id: "regime-choice",
    title: "Old vs New Regime",
    keywords: ["old regime", "new regime", "regime", "which is better", "compare regimes"],
    facts: [
      "The new regime generally has lower slab rates but fewer deductions/exemptions.",
      "The old regime can be better when eligible deductions and exemptions are high enough.",
      "The app's regime comparison should be treated as a planning estimate based only on data entered in TaxBee.",
    ],
    source:
      "https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-0?mobile-app=1%2Fe-Campaigns%2Fe-mail%2Fe-Campaigns%2Fe-mail",
  },
  {
    id: "tds-refund",
    title: "TDS and Refund Checks",
    keywords: ["tds", "refund", "tax credit", "26as", "tax deducted", "mismatch"],
    facts: [
      "TDS and tax credits should be verified with Form 26AS/AIS before filing.",
      "Refund depends on total tax liability compared with TDS, advance tax, and self-assessment tax already paid.",
      "If TDS in Form 16 does not match AIS/26AS, the user should investigate before filing.",
    ],
    source:
      "https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/ais-annual-information-statement",
  },
  {
    id: "document-checklist",
    title: "ITR Document Checklist",
    keywords: ["documents", "checklist", "before filing", "proof", "records", "itr documents"],
    facts: [
      "Common documents to verify include PAN, Aadhaar, bank details, Form 16, AIS/Form 26AS, interest certificates, capital gains statements, rent/HRA proofs, and deduction proofs.",
      "The user should keep proof for deductions and exemptions even if the return is filed online.",
      "Bank details should be checked carefully for refund processing.",
    ],
    source: "https://www.incometax.gov.in/iec/foportal/",
  },
  {
    id: "itr-form-selection",
    title: "ITR Form Selection",
    keywords: ["itr 1", "itr1", "itr 2", "itr2", "itr 3", "itr3", "itr 4", "itr4", "which itr"],
    facts: [
      "ITR form selection depends on income sources, residential status, business/profession income, capital gains, and other eligibility rules.",
      "Salary-only taxpayers often use simpler forms, but capital gains, business income, foreign assets, or other special cases can require different forms.",
      "The assistant should ask about income sources before suggesting an ITR form.",
    ],
    source: "https://www.incometax.gov.in/iec/foportal/",
  },
  {
    id: "capital-gains",
    title: "Capital Gains",
    keywords: ["capital gain", "capital gains", "stocks", "mutual fund", "shares", "property sale", "stcg", "ltcg"],
    facts: [
      "Capital gains treatment depends on asset type, holding period, sale value, acquisition cost, transfer expenses, and applicable special rates.",
      "Capital gains may not always be covered by general slab/rebate assumptions.",
      "Users should verify broker statements, AIS, and capital gains reports before filing.",
    ],
    source:
      "https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/ais-annual-information-statement",
  },
];

export const getRelevantTaxKnowledge = (message = "", context = {}) => {
  const searchable = normalize(
    `${message} ${JSON.stringify(context).slice(0, 3000)}`
  );

  const matches = KNOWLEDGE_BASE.filter((entry) =>
    entry.keywords.some((keyword) => searchable.includes(keyword))
  );

  if (matches.length > 0) return matches.slice(0, 4);

  return KNOWLEDGE_BASE.filter((entry) =>
    ["form16", "ais", "regime-choice"].includes(entry.id)
  );
};
