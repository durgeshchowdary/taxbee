export const TAX_DISCLAIMER = {
  type: "tax_compliance_disclaimer",
  version: "v1",
  title: "Important Tax Filing Disclaimer",
  message:
    "TaxBee provides AI-assisted tax insights for informational purposes only. It is not a substitute for advice from a qualified Chartered Accountant or tax professional. Users are responsible for verifying all information before filing.",
  points: [
    "AI-generated suggestions may be incomplete or inaccurate.",
    "Tax calculations must be reviewed before submission.",
    "Uploaded document extraction should be manually verified.",
    "Final filing responsibility remains with the user.",
  ],
};

export const attachTaxDisclaimer = (payload = {}) => ({
  ...payload,
  disclaimer: TAX_DISCLAIMER,
});