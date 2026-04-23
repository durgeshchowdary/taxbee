'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { STORAGE_KEYS } from '@/backend/utils/siteMap';

type SalaryDraft = {
  salary17_1: string;
  perquisites17_2: string;
  profits17_3: string;
  exemptions10: string;
  deductions16: string;
  basicSalary?: string;
  dearnessAllowance?: string;
  bonusCommission?: string;
  hraReceived?: string;
  professionalTaxPaid?: string;
  ltaReceived?: string;
  overtimeAllowance?: string;
  advanceSalary?: string;
  arrearsOfSalary?: string;
  leaveSalaryDuringService?: string;
  pensionUncommuted?: string;
  feesWagesAnnuity?: string;
  otherAllowances?: string;
  rentFreeAccommodation?: string;
  carFacility?: string;
  interestFreeLoan?: string;
  esop?: string;
  freeGasElectricityWater?: string;
  freeEducation?: string;
  householdStaff?: string;
  creditCardExpenses?: string;
  clubExpenses?: string;
  giftTaxablePortion?: string;
  useTransferOfAssets?: string;
  employerContribution?: string;
  otherPerquisites?: string;
  perquisiteDetails?: Record<string, string>;
  compensationOnTermination?: string;
  retrenchmentCompensation?: string;
  keymanInsurance?: string;
  otherReceipts?: string;
  hraExemption?: string;
  ltaExemption?: string;
  allowances10_14?: string;
  gratuityExemption?: string;
  leaveEncashmentExemption?: string;
  commutedPensionExemption?: string;
  vrsExemption?: string;
  retrenchmentCompensationExemption?: string;
  pfSuperannuationExemptPortion?: string;
  otherExemptions?: string;
  standardDeduction?: string;
  professionalTaxDeduction?: string;
  entertainmentAllowanceDeduction?: string;
};

type HousePropertyDraft = {
  annualRent?: string;
  municipalTax?: string;
  interestOnLoan?: string;
};

type PgbpDraft = {
  businessReceipts?: string;
  businessExpenses?: string;
  otherBusinessIncome?: string;
  depreciation?: string;
};

type CapitalGainsDraft = {
  saleValue?: string;
  costOfAcquisition?: string;
  transferExpenses?: string;
};

type OtherSourcesDraft = {
  savingsInterest?: string;
  fdInterest?: string;
  dividendIncome?: string;
  otherIncome?: string;
};

type ITRDraftPayload = {
  userKey: string;
  salary: SalaryDraft;
  houseProperty?: HousePropertyDraft;
  pgbp?: PgbpDraft;
  capitalGains?: CapitalGainsDraft;
  otherSources?: OtherSourcesDraft;
  aisImportMeta?: {
    fileName?: string;
    importedAt?: string;
    detectedSections?: string[];
  };
};
type SidebarIcon = 'dashboard' | 'file' | 'savings' | 'documents' | 'help';

const API_BASE = '/api/itr-draft';
const HIGHLIGHT_STORAGE_KEY = 'beeAssistantHighlight';
const formatMoney = (value: number) =>
  `Rs. ${Math.round(value || 0).toLocaleString('en-IN')}`;

export default function FileYourITRPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSalaryPopup, setShowSalaryPopup] = useState(false);
  const [showSalary17BreakdownPopup, setShowSalary17BreakdownPopup] = useState(false);
  const [showPerquisitesBreakdownPopup, setShowPerquisitesBreakdownPopup] = useState(false);
  const [showProfitsBreakdownPopup, setShowProfitsBreakdownPopup] = useState(false);
  const [showExemptionsBreakdownPopup, setShowExemptionsBreakdownPopup] = useState(false);
  const [showDeductions16BreakdownPopup, setShowDeductions16BreakdownPopup] = useState(false);
  const [highlightField, setHighlightField] = useState<string | null>(null);
  const [userName, setUserName] = useState('User');

  const [salary17_1, setSalary17_1] = useState('');
  const [perquisites17_2, setPerquisites17_2] = useState('');
  const [profits17_3, setProfits17_3] = useState('');
  const [exemptions10, setExemptions10] = useState('');
  const [deductions16, setDeductions16] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [dearnessAllowance, setDearnessAllowance] = useState('');
  const [bonusCommission, setBonusCommission] = useState('');
  const [hraReceived, setHraReceived] = useState('');
  const [professionalTaxPaid, setProfessionalTaxPaid] = useState('');
  const [ltaReceived, setLtaReceived] = useState('');
  const [overtimeAllowance, setOvertimeAllowance] = useState('');
  const [advanceSalary, setAdvanceSalary] = useState('');
  const [arrearsOfSalary, setArrearsOfSalary] = useState('');
  const [leaveSalaryDuringService, setLeaveSalaryDuringService] = useState('');
  const [pensionUncommuted, setPensionUncommuted] = useState('');
  const [feesWagesAnnuity, setFeesWagesAnnuity] = useState('');
  const [otherAllowances, setOtherAllowances] = useState('');
  const [rentFreeAccommodation, setRentFreeAccommodation] = useState('');
  const [carFacility, setCarFacility] = useState('');
  const [interestFreeLoan, setInterestFreeLoan] = useState('');
  const [esop, setEsop] = useState('');
  const [freeGasElectricityWater, setFreeGasElectricityWater] = useState('');
  const [freeEducation, setFreeEducation] = useState('');
  const [householdStaff, setHouseholdStaff] = useState('');
  const [creditCardExpenses, setCreditCardExpenses] = useState('');
  const [clubExpenses, setClubExpenses] = useState('');
  const [giftTaxablePortion, setGiftTaxablePortion] = useState('');
  const [useTransferOfAssets, setUseTransferOfAssets] = useState('');
  const [employerContribution, setEmployerContribution] = useState('');
  const [otherPerquisites, setOtherPerquisites] = useState('');
  const [perquisiteDetails, setPerquisiteDetails] = useState<Record<string, string>>({});
  const [compensationOnTermination, setCompensationOnTermination] = useState('');
  const [retrenchmentCompensation, setRetrenchmentCompensation] = useState('');
  const [keymanInsurance, setKeymanInsurance] = useState('');
  const [otherReceipts, setOtherReceipts] = useState('');
  const [hraExemption, setHraExemption] = useState('');
  const [ltaExemption, setLtaExemption] = useState('');
  const [allowances10_14, setAllowances10_14] = useState('');
  const [gratuityExemption, setGratuityExemption] = useState('');
  const [leaveEncashmentExemption, setLeaveEncashmentExemption] = useState('');
  const [commutedPensionExemption, setCommutedPensionExemption] = useState('');
  const [vrsExemption, setVrsExemption] = useState('');
  const [retrenchmentCompensationExemption, setRetrenchmentCompensationExemption] = useState('');
  const [pfSuperannuationExemptPortion, setPfSuperannuationExemptPortion] = useState('');
  const [otherExemptions, setOtherExemptions] = useState('');
  const [standardDeduction, setStandardDeduction] = useState('');
  const [professionalTaxDeduction, setProfessionalTaxDeduction] = useState('');
  const [entertainmentAllowanceDeduction, setEntertainmentAllowanceDeduction] = useState('');
  const [importedHeads, setImportedHeads] = useState<Omit<Partial<ITRDraftPayload>, 'salary' | 'userKey'>>({});

  const toNumber = (value: string) => Number(value || 0);
  const perqValue = (key: string) => perquisiteDetails[key] || '';
  const updatePerqDetail = (key: string, value: string) => {
    setPerquisiteDetails((prev) => ({ ...prev, [key]: value }));
  };
  const positive = (value: number) => Math.max(0, value);

  const getUserKey = (): string => {
    if (typeof window === 'undefined') return 'guest';

    try {
      const storedUser = localStorage.getItem('user');
      const verifiedPan = localStorage.getItem('verifiedPan');

      if (verifiedPan) return verifiedPan;

      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        return parsed?.email || parsed?.name || 'guest';
      }

      return 'guest';
    } catch {
      return 'guest';
    }
  };

  const userKey = getUserKey();
  const sidebarItems = [
    { icon: 'dashboard' as SidebarIcon, label: 'Dashboard', route: '/dashboard' },
    { icon: 'file' as SidebarIcon, label: 'File Tax', route: '/file-tax' },
    { icon: 'savings' as SidebarIcon, label: 'Tax Savings', route: '/tax-savings' },
    { icon: 'documents' as SidebarIcon, label: 'Documents', route: '/documents' },
    { icon: 'help' as SidebarIcon, label: 'Help', route: '/help' },
  ];

  const grossSalary = useMemo(
    () =>
      toNumber(salary17_1) +
      toNumber(perquisites17_2) +
      toNumber(profits17_3),
    [salary17_1, perquisites17_2, profits17_3]
  );

  const salary17BreakdownTotal = useMemo(
    () =>
      toNumber(basicSalary) +
      toNumber(dearnessAllowance) +
      toNumber(bonusCommission) +
      toNumber(hraReceived) +
      toNumber(professionalTaxPaid) +
      toNumber(ltaReceived) +
      toNumber(overtimeAllowance) +
      toNumber(advanceSalary) +
      toNumber(arrearsOfSalary) +
      toNumber(leaveSalaryDuringService) +
      toNumber(pensionUncommuted) +
      toNumber(feesWagesAnnuity) +
      toNumber(otherAllowances),
    [
      basicSalary,
      dearnessAllowance,
      bonusCommission,
      hraReceived,
      professionalTaxPaid,
      ltaReceived,
      overtimeAllowance,
      advanceSalary,
      arrearsOfSalary,
      leaveSalaryDuringService,
      pensionUncommuted,
      feesWagesAnnuity,
      otherAllowances,
    ]
  );

  const perquisiteCalculatedAmounts = useMemo(() => {
    const getValue = (key: string) => perquisiteDetails[key] || '';
    const getNumber = (key: string) => toNumber(perquisiteDetails[key] || '');
    const salaryForPerquisites =
      toNumber(basicSalary) + toNumber(dearnessAllowance) + toNumber(bonusCommission);
    const furnitureValue =
      getValue('rfaFurnitureProvided') === 'yes'
        ? getValue('rfaFurnitureMode') === 'rented'
          ? getNumber('rfaHireCharges')
          : getNumber('rfaFurnitureCost') * 0.1
        : 0;

    let rfa = 0;
    if (getValue('rfaEmployeeType') === 'govt') {
      rfa = positive(getNumber('rfaLicenseFees') - getNumber('rfaGovtRentRecovered'));
    } else if (getValue('rfaAccommodation') === 'rented') {
      const cityRate = getValue('rfaCity') === 'nonMetro' ? 0.1 : 0.15;
      rfa =
        Math.min(getNumber('rfaActualRent'), salaryForPerquisites * cityRate) -
        getNumber('rfaRentRecovered') +
        furnitureValue;
    } else {
      const cityRate = getValue('rfaCity') === 'nonMetro' ? 0.1 : 0.15;
      rfa = salaryForPerquisites * cityRate - getNumber('rfaRentRecovered') + furnitureValue;
    }

    let car = 0;
    if (getValue('carUsage') === 'personal') {
      car =
        getNumber('carActualExpenses') +
        getNumber('carCost') * 0.1 -
        getNumber('carAmountRecovered');
    } else if (getValue('carUsage') === 'both') {
      const base = getValue('carEngine') === 'gt16' ? 2400 : 1800;
      const driver = getValue('carDriver') === 'yes' ? 900 : 0;
      car = (base + driver) * getNumber('carMonths') - getNumber('carAmountRecovered');
    }

    const interestFreeLoan = positive(
      (getNumber('loanAmount') * getNumber('loanSbiRate')) / 100 -
        getNumber('loanInterestPaid')
    );
    const esop = positive(
      getNumber('esopFmv') * getNumber('esopShares') -
        getNumber('esopExercisePrice') * getNumber('esopShares')
    );
    const utilities = positive(
      getValue('utilitySource') === 'purchased'
        ? getNumber('utilityAmountPaid') - getNumber('utilityAmountRecovered')
        : getNumber('utilityUnits') * getNumber('utilityCostPerUnit') -
            getNumber('utilityAmountRecovered')
    );
    const education = positive(
      getNumber('educationCostPerChild') * getNumber('educationChildren') -
        1000 * 12 * getNumber('educationChildren') -
        getNumber('educationAmountRecovered')
    );
    const staff = positive(getNumber('staffSalaryPaid') - getNumber('staffAmountRecovered'));
    const creditCard = positive(
      getNumber('creditTotalExpenses') - getNumber('creditOfficialExpenses')
    );
    const club = positive(getNumber('clubTotalExpenses') - getNumber('clubOfficialExpenses'));
    const gift = positive(getNumber('giftTotalValue') - 5000);

    let asset = 0;
    if (getValue('assetTypeMode') === 'transfer') {
      const cost = getNumber('assetCost');
      const years = getNumber('assetYearsUsed');
      const depreciationRate =
        getValue('assetKind') === 'computer' ? 0.5 : getValue('assetKind') === 'car' ? 0.2 : 0.1;
      asset = cost - depreciationRate * years * cost - getNumber('assetAmountRecovered');
    } else {
      asset = getNumber('assetCost') * 0.1 - getNumber('assetAmountRecovered');
    }

    const employerContribution = positive(
      getNumber('pfContribution') +
        getNumber('npsContribution') +
        getNumber('superannuationContribution') +
        getNumber('interestAccretion') -
        750000
    );
    const other = positive(getNumber('otherAmountPaid') - getNumber('otherAmountRecovered'));

    return {
      rentFreeAccommodation: positive(rfa),
      carFacility: positive(car),
      interestFreeLoan,
      esop,
      freeGasElectricityWater: utilities,
      freeEducation: education,
      householdStaff: staff,
      creditCardExpenses: creditCard,
      clubExpenses: club,
      giftTaxablePortion: gift,
      useTransferOfAssets: positive(asset),
      employerContribution,
      otherPerquisites: other,
    };
  }, [perquisiteDetails, basicSalary, dearnessAllowance, bonusCommission]);

  const perquisitesBreakdownTotal = useMemo(
    () =>
      Object.values(perquisiteCalculatedAmounts).reduce(
        (total, amount) => total + amount,
        0
      ),
    [perquisiteCalculatedAmounts]
  );

  const profitsBreakdownTotal = useMemo(
    () =>
      toNumber(compensationOnTermination) +
      toNumber(retrenchmentCompensation) +
      toNumber(keymanInsurance) +
      toNumber(otherReceipts),
    [
      compensationOnTermination,
      retrenchmentCompensation,
      keymanInsurance,
      otherReceipts,
    ]
  );

  const exemptionsBreakdownTotal = useMemo(
    () =>
      toNumber(hraExemption) +
      toNumber(ltaExemption) +
      toNumber(allowances10_14) +
      toNumber(gratuityExemption) +
      toNumber(leaveEncashmentExemption) +
      toNumber(commutedPensionExemption) +
      toNumber(vrsExemption) +
      toNumber(retrenchmentCompensationExemption) +
      toNumber(pfSuperannuationExemptPortion) +
      toNumber(otherExemptions),
    [
      hraExemption,
      ltaExemption,
      allowances10_14,
      gratuityExemption,
      leaveEncashmentExemption,
      commutedPensionExemption,
      vrsExemption,
      retrenchmentCompensationExemption,
      pfSuperannuationExemptPortion,
      otherExemptions,
    ]
  );

  const deductions16BreakdownTotal = useMemo(
    () =>
      toNumber(standardDeduction) +
      toNumber(professionalTaxDeduction) +
      toNumber(entertainmentAllowanceDeduction),
    [
      standardDeduction,
      professionalTaxDeduction,
      entertainmentAllowanceDeduction,
    ]
  );

  const incomeFromSalaries = useMemo(
    () => grossSalary - toNumber(exemptions10) - toNumber(deductions16),
    [grossSalary, exemptions10, deductions16]
  );

  const housePropertyIncome = useMemo(() => {
    const house = importedHeads.houseProperty || {};
    const netAnnualValue = toNumber(house.annualRent || '') - toNumber(house.municipalTax || '');
    return netAnnualValue - (netAnnualValue > 0 ? netAnnualValue * 0.3 : 0) - toNumber(house.interestOnLoan || '');
  }, [importedHeads.houseProperty]);

  const pgbpIncome = useMemo(() => {
    const pgbp = importedHeads.pgbp || {};
    return (
      toNumber(pgbp.businessReceipts || '') -
      toNumber(pgbp.businessExpenses || '') +
      toNumber(pgbp.otherBusinessIncome || '') -
      toNumber(pgbp.depreciation || '')
    );
  }, [importedHeads.pgbp]);

  const capitalGainsIncome = useMemo(() => {
    const gains = importedHeads.capitalGains || {};
    return (
      toNumber(gains.saleValue || '') -
      toNumber(gains.costOfAcquisition || '') -
      toNumber(gains.transferExpenses || '')
    );
  }, [importedHeads.capitalGains]);

  const otherSourcesIncome = useMemo(() => {
    const other = importedHeads.otherSources || {};
    return (
      toNumber(other.savingsInterest || '') +
      toNumber(other.fdInterest || '') +
      toNumber(other.dividendIncome || '') +
      toNumber(other.otherIncome || '')
    );
  }, [importedHeads.otherSources]);

  const totalIncome = incomeFromSalaries + housePropertyIncome + pgbpIncome + capitalGainsIncome + otherSourcesIncome;
  const importedHeadCards = [
    {
      title: 'Income from House Property',
      section: 'Sections 22-27',
      amount: housePropertyIncome,
      details: [
        ['Annual rent', importedHeads.houseProperty?.annualRent],
        ['Municipal tax', importedHeads.houseProperty?.municipalTax],
        ['Interest on loan', importedHeads.houseProperty?.interestOnLoan],
      ],
    },
    {
      title: 'Profits and Gains from Business or Profession',
      section: 'Sections 28-44AD',
      amount: pgbpIncome,
      details: [
        ['Business receipts', importedHeads.pgbp?.businessReceipts],
        ['Business expenses', importedHeads.pgbp?.businessExpenses],
        ['Other business income', importedHeads.pgbp?.otherBusinessIncome],
        ['Depreciation', importedHeads.pgbp?.depreciation],
      ],
    },
    {
      title: 'Income from Capital Gains',
      section: 'Sections 45-55',
      amount: capitalGainsIncome,
      details: [
        ['Sale value', importedHeads.capitalGains?.saleValue],
        ['Cost of acquisition', importedHeads.capitalGains?.costOfAcquisition],
        ['Transfer expenses', importedHeads.capitalGains?.transferExpenses],
      ],
    },
    {
      title: 'Income from Other Sources',
      section: 'Sections 56-59',
      amount: otherSourcesIncome,
      details: [
        ['Savings interest', importedHeads.otherSources?.savingsInterest],
        ['FD interest', importedHeads.otherSources?.fdInterest],
        ['Dividend income', importedHeads.otherSources?.dividendIncome],
        ['Other income', importedHeads.otherSources?.otherIncome],
      ],
    },
  ];

  const draftPayload = useMemo<ITRDraftPayload>(
    () => ({
      userKey,
      salary: {
        salary17_1,
        perquisites17_2,
        profits17_3,
        exemptions10,
        deductions16,
        basicSalary,
        dearnessAllowance,
        bonusCommission,
        hraReceived,
        professionalTaxPaid,
        ltaReceived,
        overtimeAllowance,
        advanceSalary,
        arrearsOfSalary,
        leaveSalaryDuringService,
        pensionUncommuted,
        feesWagesAnnuity,
        otherAllowances,
        rentFreeAccommodation,
        carFacility,
        interestFreeLoan,
        esop,
        freeGasElectricityWater,
        freeEducation,
        householdStaff,
        creditCardExpenses,
        clubExpenses,
        giftTaxablePortion,
        useTransferOfAssets,
        employerContribution,
        otherPerquisites,
        perquisiteDetails,
        compensationOnTermination,
        retrenchmentCompensation,
        keymanInsurance,
        otherReceipts,
        hraExemption,
        ltaExemption,
        allowances10_14,
        gratuityExemption,
        leaveEncashmentExemption,
        commutedPensionExemption,
        vrsExemption,
        retrenchmentCompensationExemption,
        pfSuperannuationExemptPortion,
        otherExemptions,
        standardDeduction,
        professionalTaxDeduction,
        entertainmentAllowanceDeduction,
      },
      ...importedHeads,
    }),
    [
      userKey,
      salary17_1,
      perquisites17_2,
      profits17_3,
      exemptions10,
      deductions16,
      basicSalary,
      dearnessAllowance,
      bonusCommission,
      hraReceived,
      professionalTaxPaid,
      ltaReceived,
      overtimeAllowance,
      advanceSalary,
      arrearsOfSalary,
      leaveSalaryDuringService,
      pensionUncommuted,
      feesWagesAnnuity,
      otherAllowances,
      rentFreeAccommodation,
      carFacility,
      interestFreeLoan,
      esop,
      freeGasElectricityWater,
      freeEducation,
      householdStaff,
      creditCardExpenses,
      clubExpenses,
      giftTaxablePortion,
      useTransferOfAssets,
      employerContribution,
      otherPerquisites,
      perquisiteDetails,
      compensationOnTermination,
      retrenchmentCompensation,
      keymanInsurance,
      otherReceipts,
      hraExemption,
      ltaExemption,
      allowances10_14,
      gratuityExemption,
      leaveEncashmentExemption,
      commutedPensionExemption,
      vrsExemption,
      retrenchmentCompensationExemption,
      pfSuperannuationExemptPortion,
      otherExemptions,
      standardDeduction,
      professionalTaxDeduction,
      entertainmentAllowanceDeduction,
      importedHeads,
    ]
  );

  const applyDraft = (data: Partial<ITRDraftPayload>) => {
    const salary: SalaryDraft = data.salary ?? {
      salary17_1: '',
      perquisites17_2: '',
      profits17_3: '',
      exemptions10: '',
      deductions16: '',
      basicSalary: '',
      dearnessAllowance: '',
      bonusCommission: '',
      hraReceived: '',
      professionalTaxPaid: '',
      ltaReceived: '',
      overtimeAllowance: '',
      advanceSalary: '',
      arrearsOfSalary: '',
      leaveSalaryDuringService: '',
      pensionUncommuted: '',
      feesWagesAnnuity: '',
      otherAllowances: '',
      rentFreeAccommodation: '',
      carFacility: '',
      interestFreeLoan: '',
      esop: '',
      freeGasElectricityWater: '',
      freeEducation: '',
      householdStaff: '',
      creditCardExpenses: '',
      clubExpenses: '',
      giftTaxablePortion: '',
      useTransferOfAssets: '',
      employerContribution: '',
      otherPerquisites: '',
      perquisiteDetails: {},
      compensationOnTermination: '',
      retrenchmentCompensation: '',
      keymanInsurance: '',
      otherReceipts: '',
      hraExemption: '',
      ltaExemption: '',
      allowances10_14: '',
      gratuityExemption: '',
      leaveEncashmentExemption: '',
      commutedPensionExemption: '',
      vrsExemption: '',
      retrenchmentCompensationExemption: '',
      pfSuperannuationExemptPortion: '',
      otherExemptions: '',
      standardDeduction: '',
      professionalTaxDeduction: '',
      entertainmentAllowanceDeduction: '',
    };

    setSalary17_1(salary.salary17_1 || '');
    setPerquisites17_2(salary.perquisites17_2 || '');
    setProfits17_3(salary.profits17_3 || '');
    setExemptions10(salary.exemptions10 || '');
    setDeductions16(salary.deductions16 || '');
    setBasicSalary(salary.basicSalary || '');
    setDearnessAllowance(salary.dearnessAllowance || '');
    setBonusCommission(salary.bonusCommission || '');
    setHraReceived(salary.hraReceived || '');
    setProfessionalTaxPaid(salary.professionalTaxPaid || '');
    setLtaReceived(salary.ltaReceived || '');
    setOvertimeAllowance(salary.overtimeAllowance || '');
    setAdvanceSalary(salary.advanceSalary || '');
    setArrearsOfSalary(salary.arrearsOfSalary || '');
    setLeaveSalaryDuringService(salary.leaveSalaryDuringService || '');
    setPensionUncommuted(salary.pensionUncommuted || '');
    setFeesWagesAnnuity(salary.feesWagesAnnuity || '');
    setOtherAllowances(salary.otherAllowances || '');
    setRentFreeAccommodation(salary.rentFreeAccommodation || '');
    setCarFacility(salary.carFacility || '');
    setInterestFreeLoan(salary.interestFreeLoan || '');
    setEsop(salary.esop || '');
    setFreeGasElectricityWater(salary.freeGasElectricityWater || '');
    setFreeEducation(salary.freeEducation || '');
    setHouseholdStaff(salary.householdStaff || '');
    setCreditCardExpenses(salary.creditCardExpenses || '');
    setClubExpenses(salary.clubExpenses || '');
    setGiftTaxablePortion(salary.giftTaxablePortion || '');
    setUseTransferOfAssets(salary.useTransferOfAssets || '');
    setEmployerContribution(salary.employerContribution || '');
    setOtherPerquisites(salary.otherPerquisites || '');
    setPerquisiteDetails(salary.perquisiteDetails || {});
    setCompensationOnTermination(salary.compensationOnTermination || '');
    setRetrenchmentCompensation(salary.retrenchmentCompensation || '');
    setKeymanInsurance(salary.keymanInsurance || '');
    setOtherReceipts(salary.otherReceipts || '');
    setHraExemption(salary.hraExemption || '');
    setLtaExemption(salary.ltaExemption || '');
    setAllowances10_14(salary.allowances10_14 || '');
    setGratuityExemption(salary.gratuityExemption || '');
    setLeaveEncashmentExemption(salary.leaveEncashmentExemption || '');
    setCommutedPensionExemption(salary.commutedPensionExemption || '');
    setVrsExemption(salary.vrsExemption || '');
    setRetrenchmentCompensationExemption(salary.retrenchmentCompensationExemption || '');
    setPfSuperannuationExemptPortion(salary.pfSuperannuationExemptPortion || '');
    setOtherExemptions(salary.otherExemptions || '');
    setStandardDeduction(salary.standardDeduction || '');
    setProfessionalTaxDeduction(salary.professionalTaxDeduction || '');
    setEntertainmentAllowanceDeduction(salary.entertainmentAllowanceDeduction || '');
    setImportedHeads({
      houseProperty: data.houseProperty,
      pgbp: data.pgbp,
      capitalGains: data.capitalGains,
      otherSources: data.otherSources,
      aisImportMeta: data.aisImportMeta,
    });
  };

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const parsed = savedUser ? (JSON.parse(savedUser) as { name?: string }) : null;
      setUserName(parsed?.name || 'User');
    } catch {
      setUserName('User');
    }
  }, []);

  useEffect(() => {
    const syncAssistantUpdates = () => {
      try {
        const localDraft = localStorage.getItem('itrDraft');
        if (localDraft) {
          applyDraft(JSON.parse(localDraft) as Partial<ITRDraftPayload>);
        }
      } catch {}
    };

    window.addEventListener('taxbee:storage-updated', syncAssistantUpdates);
    return () => window.removeEventListener('taxbee:storage-updated', syncAssistantUpdates);
  }, []);

  useEffect(() => {
    const syncHighlight = () => {
      try {
        const saved = localStorage.getItem(HIGHLIGHT_STORAGE_KEY);
        if (!saved) return;

        const highlight = JSON.parse(saved) as {
          key?: string;
          path?: string;
          route?: string;
        };

        if (highlight.key !== 'itrDraft') return;

        setHighlightField(highlight.path || null);
        localStorage.removeItem(HIGHLIGHT_STORAGE_KEY);
        window.setTimeout(() => setHighlightField(null), 4500);
      } catch {
        localStorage.removeItem(HIGHLIGHT_STORAGE_KEY);
      }
    };

    syncHighlight();
    window.addEventListener('taxbee:highlight-field', syncHighlight);
    return () => window.removeEventListener('taxbee:highlight-field', syncHighlight);
  }, []);

  const detailInputClass = (field: keyof SalaryDraft) =>
    `w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-right font-semibold text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${
      highlightField === field || highlightField === `salary.${field}`
        ? 'ring-4 ring-yellow-300 bg-yellow-50'
        : ''
    }`;

  const hasSalary17Breakdown = useMemo(
    () =>
      [
        basicSalary,
        dearnessAllowance,
        bonusCommission,
        hraReceived,
        professionalTaxPaid,
        ltaReceived,
        overtimeAllowance,
        advanceSalary,
        arrearsOfSalary,
        leaveSalaryDuringService,
        pensionUncommuted,
        feesWagesAnnuity,
        otherAllowances,
      ].some((value) => Number(value || 0) > 0),
    [
      basicSalary,
      dearnessAllowance,
      bonusCommission,
      hraReceived,
      professionalTaxPaid,
      ltaReceived,
      overtimeAllowance,
      advanceSalary,
      arrearsOfSalary,
      leaveSalaryDuringService,
      pensionUncommuted,
      feesWagesAnnuity,
      otherAllowances,
    ]
  );

  const hasPerquisitesBreakdown = useMemo(
    () =>
      Object.values(perquisiteDetails).some((value) => Boolean(value)) ||
      Object.values(perquisiteCalculatedAmounts).some((value) => value > 0),
    [perquisiteDetails, perquisiteCalculatedAmounts]
  );

  const handleSalary17BreakdownSave = () => {
    setSalary17_1(String(salary17BreakdownTotal || ''));
    setShowSalary17BreakdownPopup(false);
  };

  const handlePerquisitesBreakdownSave = () => {
    setRentFreeAccommodation(String(perquisiteCalculatedAmounts.rentFreeAccommodation || ''));
    setCarFacility(String(perquisiteCalculatedAmounts.carFacility || ''));
    setInterestFreeLoan(String(perquisiteCalculatedAmounts.interestFreeLoan || ''));
    setEsop(String(perquisiteCalculatedAmounts.esop || ''));
    setFreeGasElectricityWater(String(perquisiteCalculatedAmounts.freeGasElectricityWater || ''));
    setFreeEducation(String(perquisiteCalculatedAmounts.freeEducation || ''));
    setHouseholdStaff(String(perquisiteCalculatedAmounts.householdStaff || ''));
    setCreditCardExpenses(String(perquisiteCalculatedAmounts.creditCardExpenses || ''));
    setClubExpenses(String(perquisiteCalculatedAmounts.clubExpenses || ''));
    setGiftTaxablePortion(String(perquisiteCalculatedAmounts.giftTaxablePortion || ''));
    setUseTransferOfAssets(String(perquisiteCalculatedAmounts.useTransferOfAssets || ''));
    setEmployerContribution(String(perquisiteCalculatedAmounts.employerContribution || ''));
    setOtherPerquisites(String(perquisiteCalculatedAmounts.otherPerquisites || ''));
    setPerquisites17_2(String(perquisitesBreakdownTotal || ''));
    setShowPerquisitesBreakdownPopup(false);
  };

  const hasProfitsBreakdown = useMemo(
    () =>
      [
        compensationOnTermination,
        retrenchmentCompensation,
        keymanInsurance,
        otherReceipts,
      ].some((value) => Number(value || 0) > 0),
    [
      compensationOnTermination,
      retrenchmentCompensation,
      keymanInsurance,
      otherReceipts,
    ]
  );

  const handleProfitsBreakdownSave = () => {
    setProfits17_3(String(profitsBreakdownTotal || ''));
    setShowProfitsBreakdownPopup(false);
  };

  const hasExemptionsBreakdown = useMemo(
    () =>
      [
        hraExemption,
        ltaExemption,
        allowances10_14,
        gratuityExemption,
        leaveEncashmentExemption,
        commutedPensionExemption,
        vrsExemption,
        retrenchmentCompensationExemption,
        pfSuperannuationExemptPortion,
        otherExemptions,
      ].some((value) => Number(value || 0) > 0),
    [
      hraExemption,
      ltaExemption,
      allowances10_14,
      gratuityExemption,
      leaveEncashmentExemption,
      commutedPensionExemption,
      vrsExemption,
      retrenchmentCompensationExemption,
      pfSuperannuationExemptPortion,
      otherExemptions,
    ]
  );

  const handleExemptionsBreakdownSave = () => {
    setExemptions10(String(exemptionsBreakdownTotal || ''));
    setShowExemptionsBreakdownPopup(false);
  };

  const hasDeductions16Breakdown = useMemo(
    () =>
      [
        standardDeduction,
        professionalTaxDeduction,
        entertainmentAllowanceDeduction,
      ].some((value) => Number(value || 0) > 0),
    [
      standardDeduction,
      professionalTaxDeduction,
      entertainmentAllowanceDeduction,
    ]
  );

  const handleDeductions16BreakdownSave = () => {
    setDeductions16(String(deductions16BreakdownTotal || ''));
    setShowDeductions16BreakdownPopup(false);
  };

  const salary17BreakdownRows: Array<
    [string, string, (value: string) => void, keyof SalaryDraft]
  > = [
    ['a) BASIC SALARY', basicSalary, setBasicSalary, 'basicSalary'],
    ['b) DEARNESS ALLOWANCE (DA)', dearnessAllowance, setDearnessAllowance, 'dearnessAllowance'],
    ['c) BONUS / COMMISSION', bonusCommission, setBonusCommission, 'bonusCommission'],
    ['d) HRA RECEIVED', hraReceived, setHraReceived, 'hraReceived'],
    ['e) PROFESSIONAL TAX PAID', professionalTaxPaid, setProfessionalTaxPaid, 'professionalTaxPaid'],
    ['f) LTA RECEIVED', ltaReceived, setLtaReceived, 'ltaReceived'],
    ['g) OVERTIME ALLOWANCE', overtimeAllowance, setOvertimeAllowance, 'overtimeAllowance'],
    ['h) ADVANCE SALARY', advanceSalary, setAdvanceSalary, 'advanceSalary'],
    ['i) ARREARS OF SALARY', arrearsOfSalary, setArrearsOfSalary, 'arrearsOfSalary'],
    ['j) LEAVE SALARY (DURING SERVICE)', leaveSalaryDuringService, setLeaveSalaryDuringService, 'leaveSalaryDuringService'],
    ['k) PENSION (UNCOMMUTED)', pensionUncommuted, setPensionUncommuted, 'pensionUncommuted'],
    ['l) FEES / WAGES / ANNUITY', feesWagesAnnuity, setFeesWagesAnnuity, 'feesWagesAnnuity'],
    ['m) ALL OTHER ALLOWANCES', otherAllowances, setOtherAllowances, 'otherAllowances'],
  ];

  const profitsBreakdownRows: Array<
    [string, string, (value: string) => void, keyof SalaryDraft]
  > = [
    ['Compensation on Termination', compensationOnTermination, setCompensationOnTermination, 'compensationOnTermination'],
    ['Retrenchment Compensation (Taxable portion)', retrenchmentCompensation, setRetrenchmentCompensation, 'retrenchmentCompensation'],
    ['Keyman Insurance', keymanInsurance, setKeymanInsurance, 'keymanInsurance'],
    ['Other Receipts', otherReceipts, setOtherReceipts, 'otherReceipts'],
  ];

  const exemptionsBreakdownRows: Array<
    [string, string, (value: string) => void, keyof SalaryDraft]
  > = [
    ['HRA Exemption', hraExemption, setHraExemption, 'hraExemption'],
    ['LTA Exemption', ltaExemption, setLtaExemption, 'ltaExemption'],
    ['Allowances u/s 10(14)', allowances10_14, setAllowances10_14, 'allowances10_14'],
    ['Gratuity Exemption', gratuityExemption, setGratuityExemption, 'gratuityExemption'],
    ['Leave Encashment Exemption', leaveEncashmentExemption, setLeaveEncashmentExemption, 'leaveEncashmentExemption'],
    ['Commuted Pension Exemption', commutedPensionExemption, setCommutedPensionExemption, 'commutedPensionExemption'],
    ['VRS Exemption', vrsExemption, setVrsExemption, 'vrsExemption'],
    ['Retrenchment Compensation Exemption', retrenchmentCompensationExemption, setRetrenchmentCompensationExemption, 'retrenchmentCompensationExemption'],
    ['PF / Superannuation Exempt Portion', pfSuperannuationExemptPortion, setPfSuperannuationExemptPortion, 'pfSuperannuationExemptPortion'],
    ['Other Exemptions', otherExemptions, setOtherExemptions, 'otherExemptions'],
  ];

  const deductions16BreakdownRows: Array<
    [string, string, (value: string) => void, keyof SalaryDraft]
  > = [
    ['Standard Deduction (Rs. 50,000)', standardDeduction, setStandardDeduction, 'standardDeduction'],
    ['Professional Tax', professionalTaxDeduction, setProfessionalTaxDeduction, 'professionalTaxDeduction'],
    ['Entertainment Allowance (Govt only)', entertainmentAllowanceDeduction, setEntertainmentAllowanceDeduction, 'entertainmentAllowanceDeduction'],
  ];

  const perqAmountInput = (key: string, placeholder = 'ENTER AMOUNT') => (
    <input
      type="number"
      value={perqValue(key)}
      onChange={(e) => updatePerqDetail(key, e.target.value)}
      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-right font-semibold text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      placeholder={placeholder}
    />
  );

  const perqTextInput = (key: string, placeholder = 'Enter details') => (
    <input
      type="text"
      value={perqValue(key)}
      onChange={(e) => updatePerqDetail(key, e.target.value)}
      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      placeholder={placeholder}
    />
  );

  const perqRadioGroup = (
    key: string,
    options: Array<[string, string]>,
    columns = 'sm:grid-cols-2'
  ) => (
    <div className={`grid gap-2 ${columns}`}>
      {options.map(([value, label]) => (
        <label
          key={value}
          className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
            perqValue(key) === value
              ? 'border-blue-300 bg-blue-50 text-blue-800'
              : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200'
          }`}
        >
          <input
            type="radio"
            name={key}
            value={value}
            checked={perqValue(key) === value}
            onChange={(e) => updatePerqDetail(key, e.target.value)}
            className="h-4 w-4 accent-blue-600"
          />
          {label}
        </label>
      ))}
    </div>
  );

  const perqSection = (
    title: string,
    amount: number,
    formula: string,
    children: ReactNode
  ) => (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-3">
        <div>
          <h4 className="text-lg font-bold text-gray-900">{title}</h4>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Formula: {formula}
          </p>
        </div>
        <div className="rounded-xl bg-blue-50 px-4 py-2 text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Calculated</p>
          <p className="text-base font-bold text-gray-900">{formatMoney(amount)}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );

  const perqField = (label: string, input: ReactNode) => (
    <label className="grid gap-1.5 text-sm font-semibold text-gray-700">
      <span>{label}</span>
      {input}
    </label>
  );


  useEffect(() => {
    const loadDraft = async () => {
      try {
        const localDraft = localStorage.getItem('itrDraft');
        if (localDraft) {
          applyDraft(JSON.parse(localDraft) as Partial<ITRDraftPayload>);
        }

        const res = await fetch(`${API_BASE}/${encodeURIComponent(userKey)}`);
        const text = await res.text();
        console.log('Load draft raw response:', text);

        let data: { draft: Partial<ITRDraftPayload> | null } | null = null;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Expected JSON but got: ${text.slice(0, 150)}`);
        }

        if (res.ok && data?.draft) {
          applyDraft(data.draft);
          localStorage.setItem('itrDraft', JSON.stringify(data.draft));
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDraft();
  }, [userKey]);

  useEffect(() => {
    if (isLoading) return;
    localStorage.setItem('itrDraft', JSON.stringify(draftPayload));
  }, [isLoading, draftPayload]);

  const saveDraftToBackend = async () => {
    setIsSaving(true);
    try {
      const payload = draftPayload;
      localStorage.setItem('itrDraft', JSON.stringify(payload));

      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      console.log('Save draft raw response:', text);

      let data: { message?: string } | null = null;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Expected JSON but got: ${text.slice(0, 150)}`);
      }

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to save draft');
      }

      return true;
    } catch (error) {
      console.error('saveDraftToBackend error:', error);
      alert('Failed to save draft to backend.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSectionSave = async (closePopup: () => void) => {
    const ok = await saveDraftToBackend();
    if (ok) {
      closePopup();
      alert('Draft saved successfully!');
    }
  };

  const handleProceed = async () => {
    const ok = await saveDraftToBackend();
    if (!ok) return;

    localStorage.setItem(
      'itrSummary',
      JSON.stringify({
        userKey,
        totalIncome,
        incomeFromSalaries,
        housePropertyIncome,
        pgbpIncome,
        capitalGainsIncome,
        otherSourcesIncome,
        aisImportMeta: importedHeads.aisImportMeta,
      })
    );

    router.push('/deductions');
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.AIS_IMPORT);
    localStorage.removeItem(STORAGE_KEYS.VERIFIED_PAN);
    localStorage.removeItem(STORAGE_KEYS.TAXPAYER_PROFILE);
    localStorage.removeItem('token');
    router.push('/login');
  };

  const renderSidebarIcon = (icon: SidebarIcon) => {
    const iconClass = 'h-5 w-5';

    if (icon === 'dashboard') {
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
          <path d="M4 5h7v6H4V5ZM13 5h7v4h-7V5ZM13 11h7v8h-7v-8ZM4 13h7v6H4v-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    }

    if (icon === 'file') {
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
          <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9.5 13h5M9.5 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    }

    if (icon === 'savings') {
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
          <path d="M6 11c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5-2.7 5.5-6 5.5S6 14 6 11Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 8v6M9.5 10h3.8a1.7 1.7 0 0 1 0 3.4H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8 18.5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    }

    if (icon === 'documents') {
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
          <path d="M4 7.5h6l1.6 2H20v8.5H4V7.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M4 7.5V5h5.5l1.6 2H17" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" aria-hidden="true">
        <path d="M9.5 9a2.7 2.7 0 1 1 4.8 1.7c-.9.8-1.8 1.3-1.8 2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 17h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M4.5 12a7.5 7.5 0 1 0 15 0 7.5 7.5 0 0 0-15 0Z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-2xl bg-white px-6 py-4 text-lg font-semibold shadow">
          Loading your draft...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-gray-900">
      <aside className="fixed flex h-full w-64 flex-col border-r border-gray-800 bg-[#0f172a] px-4 py-5 text-white shadow-2xl">
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-7 flex items-center gap-3 rounded-2xl bg-white/5 p-3 text-left ring-1 ring-white/10 transition hover:bg-white/10"
        >
          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg shadow-yellow-400/20 ring-2 ring-yellow-400/70">
            <Image src="/logo.jpg" alt="TaxBee logo" width={48} height={48} className="h-full w-full object-cover" priority />
          </span>
          <span>
            <span className="block text-xl font-black tracking-tight text-white">TaxBee</span>
            <span className="block text-xs font-semibold text-gray-400">Personal tax workspace</span>
          </span>
        </button>

        <div className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
          Menu
        </div>

        <nav className="flex flex-1 flex-col gap-1.5">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.route)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                pathname === item.route || (pathname === '/file-your-itr' && item.route === '/file-tax')
                  ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/15'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span
                className={`flex h-8 w-10 items-center justify-center rounded-lg ${
                  pathname === item.route || (pathname === '/file-your-itr' && item.route === '/file-tax')
                    ? 'bg-black/10 text-black'
                    : 'bg-white/5 text-gray-300 group-hover:bg-white/10 group-hover:text-white'
                }`}
              >
                {renderSidebarIcon(item.icon)}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-semibold text-gray-400">Signed in</p>
          <p className="mt-1 truncate text-sm font-bold text-white">{userName}</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-xl border border-red-400/20 px-3 py-2 text-left text-sm font-semibold text-red-300 transition hover:bg-red-400/10 hover:text-red-200"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="ml-64 flex-1 p-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="hidden"
        >
          ← Back to Dashboard
        </button>

        <div className="mb-6 rounded-[28px] bg-slate-100">
          <div className="hidden">TaxBee</div>
          <h1 className="text-4xl font-bold text-gray-900">
            Income Declaration for Section 139(1)
          </h1>
          <p className="mt-2 text-lg text-gray-500">
            Review imported AIS heads and declare income for accurate computation
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-500">Step 1 of 4</p>
            <button
              onClick={saveDraftToBackend}
              disabled={isSaving}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
            <span className="rounded-full bg-blue-600 px-3 py-1 text-white">
              Declare Income
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">Review Details</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">Claim Deductions</span>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Imported Income</p>
              <h2 className="mt-1 text-3xl font-bold text-gray-900">
                {formatMoney(totalIncome)}
              </h2>
            </div>
            <div className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-bold text-gray-900">
              AIS Mapped Heads
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div
            onClick={() => setShowSalaryPopup(true)}
            className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-gray-900">
                  Income from Salary (Section 17)
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Salary, perquisites, profits in lieu, exemptions and deductions
                </p>
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-gray-600">Section 17</span>
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">Review required</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold text-gray-900">
                  {formatMoney(incomeFromSalaries)} &gt;
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSalaryPopup(true);
                  }}
                  className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  + Add Salary Income
                </button>
              </div>
            </div>
          </div>

          {importedHeadCards.map((head) => {
            const visibleDetails = head.details.filter(([, value]) => Number(value || 0) > 0);
            return (
              <div key={head.title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-bold text-gray-900">{head.title}</div>
                    <p className="mt-1 text-sm text-gray-500">{head.section}</p>
                    <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                      {visibleDetails.length > 0 ? (
                        visibleDetails.map(([label, value]) => (
                          <div key={label} className="rounded-lg bg-gray-50 px-3 py-2">
                            <span className="text-gray-500">{label}: </span>
                            <span className="font-semibold text-gray-900">
                              â‚¹ {Number(value || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg bg-gray-50 px-3 py-2 text-gray-500">
                          No AIS value mapped yet
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">
                      â‚¹ {head.amount.toLocaleString('en-IN')}
                    </div>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Imported
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl bg-yellow-50 p-4 text-sm font-medium text-gray-700 shadow">
          💡 Pro Tip: Fill salary details exactly as per Form 16 / salary slip.
        </div>

        <div className="mt-8 flex flex-wrap justify-between gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-black hover:bg-gray-50"
          >
            Cancel
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-xl border border-black bg-white px-5 py-3 font-semibold text-black hover:bg-gray-100"
            >
              ‹ Back
            </button>
            <button
              onClick={handleProceed}
              disabled={isSaving}
              className="rounded-xl bg-black px-5 py-3 font-semibold text-yellow-400 hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Proceed →'}
            </button>
          </div>
        </div>
      </main>

      {showSalaryPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl border-4 border-yellow-400 bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between bg-black px-6 py-4">
              <h2 className="text-2xl font-bold text-yellow-400">
                🐝 Income From Salaries
              </h2>
              <button
                onClick={() => setShowSalaryPopup(false)}
                className="rounded-lg bg-yellow-400 px-4 py-2 font-semibold text-black hover:bg-yellow-300"
              >
                Close
              </button>
            </div>

            <div className="p-6">
              <div className="overflow-hidden rounded-xl border-2 border-black">
                <table className="w-full border-collapse text-sm md:text-base">
                  <tbody>
                    <tr>
                      <td
                        colSpan={2}
                        className="border border-black bg-gray-100 px-4 py-3 text-center text-xl font-bold"
                      >
                        INCOME FROM SALARIES
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-3 font-bold"></td>
                      <td className="border border-black px-4 py-3 text-center font-bold">
                        AMOUNT
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">
                        <button
                          type="button"
                          onClick={() => setShowSalary17BreakdownPopup(true)}
                          className="flex w-full items-center justify-between gap-3 text-left text-inherit"
                        >
                          <span>1) SALARY U/S 17(1)</span>
                          <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                            Open details
                          </span>
                        </button>
                      </td>
                      <td className="border border-black px-4 py-2">
                        <button
                          type="button"
                          onClick={() => setShowSalary17BreakdownPopup(true)}
                          className={`w-full rounded-xl border px-3 py-2 text-right font-semibold transition ${
                            hasSalary17Breakdown
                              ? 'border-blue-200 bg-blue-50 text-gray-900 hover:bg-blue-100'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50'
                          }`}
                        >
                          {hasSalary17Breakdown || salary17_1
                            ? formatMoney(toNumber(salary17_1))
                            : 'Enter amount'}
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">
                        <button
                          type="button"
                          onClick={() => setShowPerquisitesBreakdownPopup(true)}
                          className="flex w-full items-center justify-between gap-3 text-left text-inherit"
                        >
                          <span>2) ADD: PERQUISITES U/S 17(2)</span>
                          <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                            Open details
                          </span>
                        </button>
                      </td>
                      <td className="border border-black px-4 py-2">
                        <button
                          type="button"
                          onClick={() => setShowPerquisitesBreakdownPopup(true)}
                          className={`w-full rounded-xl border px-3 py-2 text-right font-semibold transition ${
                            hasPerquisitesBreakdown
                              ? 'border-blue-200 bg-blue-50 text-gray-900 hover:bg-blue-100'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50'
                          }`}
                        >
                          {hasPerquisitesBreakdown || perquisites17_2
                            ? formatMoney(toNumber(perquisites17_2))
                            : 'Enter amount'}
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">
                        <button
                          type="button"
                          onClick={() => setShowProfitsBreakdownPopup(true)}
                          className="flex w-full items-center justify-between gap-3 text-left text-inherit"
                        >
                          <span>3) ADD: PROFITS IN LIEU OF SALARY U/S 17(3)</span>
                          <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                            Open details
                          </span>
                        </button>
                      </td>
                      <td className="border border-black px-4 py-2">
                        <button
                          type="button"
                          onClick={() => setShowProfitsBreakdownPopup(true)}
                          className={`w-full rounded-xl border px-3 py-2 text-right font-semibold transition ${
                            hasProfitsBreakdown
                              ? 'border-blue-200 bg-blue-50 text-gray-900 hover:bg-blue-100'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50'
                          }`}
                        >
                          {hasProfitsBreakdown || profits17_3
                            ? formatMoney(toNumber(profits17_3))
                            : 'Enter amount'}
                        </button>
                      </td>
                    </tr>
                    <tr className="bg-yellow-50">
                      <td className="border border-black px-4 py-4 font-bold text-red-600">
                        GROSS SALARY
                      </td>
                      <td className="border border-black px-4 py-4 font-bold text-red-600">
                        ₹ {grossSalary.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">
                        <button
                          type="button"
                          onClick={() => setShowExemptionsBreakdownPopup(true)}
                          className="flex w-full items-center justify-between gap-3 text-left text-inherit"
                        >
                          <span>4) LESS: EXEMPTIONS U/S 10</span>
                          <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                            Open details
                          </span>
                        </button>
                      </td>
                      <td className="border border-black px-4 py-2">
                        <button
                          type="button"
                          onClick={() => setShowExemptionsBreakdownPopup(true)}
                          className={`w-full rounded-xl border px-3 py-2 text-right font-semibold transition ${
                            hasExemptionsBreakdown
                              ? 'border-blue-200 bg-blue-50 text-gray-900 hover:bg-blue-100'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50'
                          }`}
                        >
                          {hasExemptionsBreakdown || exemptions10
                            ? formatMoney(toNumber(exemptions10))
                            : 'Enter amount'}
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-4 py-4 font-bold">
                        <button
                          type="button"
                          onClick={() => setShowDeductions16BreakdownPopup(true)}
                          className="flex w-full items-center justify-between gap-3 text-left text-inherit"
                        >
                          <span>5) LESS: DEDUCTIONS U/S 16</span>
                          <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                            Open details
                          </span>
                        </button>
                      </td>
                      <td className="border border-black px-4 py-2">
                        <button
                          type="button"
                          onClick={() => setShowDeductions16BreakdownPopup(true)}
                          className={`w-full rounded-xl border px-3 py-2 text-right font-semibold transition ${
                            hasDeductions16Breakdown
                              ? 'border-blue-200 bg-blue-50 text-gray-900 hover:bg-blue-100'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50'
                          }`}
                        >
                          {hasDeductions16Breakdown || deductions16
                            ? formatMoney(toNumber(deductions16))
                            : 'Enter amount'}
                        </button>
                      </td>
                    </tr>
                    <tr className="bg-black">
                      <td className="border border-black px-4 py-4 font-bold text-yellow-400">
                        INCOME FROM SALARIES
                      </td>
                      <td className="border border-black px-4 py-4 font-bold text-yellow-400">
                        ₹ {incomeFromSalaries.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowSalaryPopup(false)}
                  className="rounded-xl border border-black bg-white px-5 py-3 font-semibold text-black hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSectionSave(() => setShowSalaryPopup(false))}
                  className="rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black hover:bg-yellow-300"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSalary17BreakdownPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Salary U/S 17(1)</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Enter each salary component. Total Salary (A) is calculated automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSalary17BreakdownPopup(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="p-6">
              <div className="overflow-hidden rounded-2xl border border-gray-200">
                <table className="w-full border-collapse text-sm md:text-base">
                  <tbody>
                    <tr className="bg-gray-50">
                      <td
                        colSpan={2}
                        className="border-b border-gray-200 px-4 py-4 text-center text-lg font-bold text-gray-900"
                      >
                        1) SALARY U/S 17(1)
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border-b border-gray-200 px-4 py-3 font-bold text-gray-700">
                        PARTICULARS
                      </td>
                      <td className="border-b border-l border-gray-200 px-4 py-3 text-center font-bold text-gray-700">
                        AMOUNT
                      </td>
                    </tr>
                    {salary17BreakdownRows.map(([label, value, setter, fieldKey]) => (
                      <tr key={String(fieldKey)}>
                        <td className="border-b border-gray-200 px-4 py-4 font-semibold text-gray-800">
                          {label}
                        </td>
                        <td className="border-b border-l border-gray-200 px-4 py-2">
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                            className={detailInputClass(fieldKey)}
                            placeholder="ENTER AMOUNT"
                          />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50">
                      <td className="px-4 py-4 font-bold text-gray-900">TOTAL SALARY (A)</td>
                      <td className="border-l border-gray-200 px-4 py-4 text-right font-bold text-gray-900">
                        {formatMoney(salary17BreakdownTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-gray-500">
                  This page closes after Save and Continue.
                </p>
                <button
                  type="button"
                  onClick={handleSalary17BreakdownSave}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  Save and Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPerquisitesBreakdownPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Perquisites U/S 17(2)</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Enter each taxable perquisite. Total Perquisites (B) is calculated automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPerquisitesBreakdownPopup(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="p-6">
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                Other than RFA, all other perquisites are fully taxable for Govt employees.
              </div>

              <div className="space-y-5">
                {perqSection(
                  '1. Rent Free Accommodation (RFA)',
                  perquisiteCalculatedAmounts.rentFreeAccommodation,
                  'Govt: license fees - rent recovered. Non-Govt: 15% metro / 10% non-metro salary or actual rent rule + furniture - rent recovered.',
                  <>
                    {perqField(
                      'Employee Type',
                      perqRadioGroup('rfaEmployeeType', [
                        ['govt', 'Govt'],
                        ['nonGovt', 'Non-Govt'],
                      ])
                    )}
                    {perqValue('rfaEmployeeType') === 'govt' ? (
                      <>
                        {perqField('License Fees', perqAmountInput('rfaLicenseFees'))}
                        {perqField('Rent Recovered', perqAmountInput('rfaGovtRentRecovered'))}
                      </>
                    ) : (
                      <>
                        {perqField(
                          'City',
                          perqRadioGroup('rfaCity', [
                            ['metro', 'Metro'],
                            ['nonMetro', 'Non-Metro'],
                          ])
                        )}
                        {perqField(
                          'Accommodation',
                          perqRadioGroup('rfaAccommodation', [
                            ['owned', 'Owned by Employer'],
                            ['rented', 'Rented by Employer'],
                          ])
                        )}
                        {perqField('Actual Rent (if rented)', perqAmountInput('rfaActualRent'))}
                        {perqField('Rent Recovered', perqAmountInput('rfaRentRecovered'))}
                        {perqField(
                          'Furniture Provided?',
                          perqRadioGroup('rfaFurnitureProvided', [
                            ['yes', 'Yes'],
                            ['no', 'No'],
                          ])
                        )}
                        {perqValue('rfaFurnitureProvided') === 'yes' && (
                          <>
                            {perqField(
                              'Furniture Mode',
                              perqRadioGroup('rfaFurnitureMode', [
                                ['owned', 'Owned'],
                                ['rented', 'Rented'],
                              ])
                            )}
                            {perqField('Furniture Cost', perqAmountInput('rfaFurnitureCost'))}
                            {perqField('Hire Charges', perqAmountInput('rfaHireCharges'))}
                          </>
                        )}
                      </>
                    )}
                  </>
                )}

                {perqSection(
                  '2. Car Facility',
                  perquisiteCalculatedAmounts.carFacility,
                  'Official: 0. Mixed: engine slab x months + driver slab - recovered. Personal: expenses + 10% car cost - recovered.',
                  <>
                    {perqField(
                      'Engine Capacity',
                      perqRadioGroup('carEngine', [
                        ['le16', '<= 1.6L'],
                        ['gt16', '> 1.6L'],
                      ])
                    )}
                    {perqField(
                      'Usage',
                      perqRadioGroup('carUsage', [
                        ['official', 'Official'],
                        ['personal', 'Personal'],
                        ['both', 'Both'],
                      ], 'sm:grid-cols-3')
                    )}
                    {perqField(
                      'Driver Provided?',
                      perqRadioGroup('carDriver', [
                        ['yes', 'Yes'],
                        ['no', 'No'],
                      ])
                    )}
                    {perqField('Actual Expenses', perqAmountInput('carActualExpenses'))}
                    {perqField('No. of Months', perqAmountInput('carMonths'))}
                    {perqField('Car Cost', perqAmountInput('carCost'))}
                    {perqField('Amount Recovered', perqAmountInput('carAmountRecovered'))}
                  </>
                )}

                {perqSection(
                  '3. Interest-Free Loan',
                  perquisiteCalculatedAmounts.interestFreeLoan,
                  '(SBI rate x loan amount) - interest paid',
                  <>
                    {perqField('Loan Amount', perqAmountInput('loanAmount'))}
                    {perqField('SBI Interest Rate (%)', perqAmountInput('loanSbiRate'))}
                    {perqField('Interest Paid', perqAmountInput('loanInterestPaid'))}
                  </>
                )}

                {perqSection(
                  '4. ESOP',
                  perquisiteCalculatedAmounts.esop,
                  '(FMV x shares) - (exercise price x shares)',
                  <>
                    {perqField('No. of Shares', perqAmountInput('esopShares'))}
                    {perqField('Exercise Price', perqAmountInput('esopExercisePrice'))}
                    {perqField('FMV on Exercise Date', perqAmountInput('esopFmv'))}
                    {perqField('Date of Exercise', perqTextInput('esopExerciseDate', 'DD/MM/YYYY'))}
                  </>
                )}

                {perqSection(
                  '5. Free Gas / Electricity / Water',
                  perquisiteCalculatedAmounts.freeGasElectricityWater,
                  'Employer owned: units x cost per unit - recovered. Purchased: amount paid - recovered.',
                  <>
                    {perqField(
                      'Source',
                      perqRadioGroup('utilitySource', [
                        ['owned', 'Employer Owned'],
                        ['purchased', 'Purchased'],
                      ])
                    )}
                    {perqField('Units Consumed', perqAmountInput('utilityUnits'))}
                    {perqField('Cost per Unit', perqAmountInput('utilityCostPerUnit'))}
                    {perqField('Amount Paid', perqAmountInput('utilityAmountPaid'))}
                    {perqField('Amount Recovered', perqAmountInput('utilityAmountRecovered'))}
                  </>
                )}

                {perqSection(
                  '6. Free Education',
                  perquisiteCalculatedAmounts.freeEducation,
                  '(cost per child x children) - (1000 x 12 x children) - recovered',
                  <>
                    {perqField('No. of Children', perqAmountInput('educationChildren'))}
                    {perqField('Cost per Child', perqAmountInput('educationCostPerChild'))}
                    {perqField(
                      'Employer Institution?',
                      perqRadioGroup('educationEmployerInstitution', [
                        ['yes', 'Yes'],
                        ['no', 'No'],
                      ])
                    )}
                    {perqField('Amount Paid', perqAmountInput('educationAmountPaid'))}
                    {perqField('Amount Recovered', perqAmountInput('educationAmountRecovered'))}
                  </>
                )}

                {perqSection(
                  '7. Household Staff',
                  perquisiteCalculatedAmounts.householdStaff,
                  'salary paid - amount recovered',
                  <>
                    {perqField('Type of Staff', perqTextInput('staffType'))}
                    {perqField('Salary Paid', perqAmountInput('staffSalaryPaid'))}
                    {perqField('Amount Recovered', perqAmountInput('staffAmountRecovered'))}
                  </>
                )}

                {perqSection(
                  '8. Credit Card Expenses',
                  perquisiteCalculatedAmounts.creditCardExpenses,
                  'total expenses - official expenses',
                  <>
                    {perqField('Total Expenses', perqAmountInput('creditTotalExpenses'))}
                    {perqField('Official Expenses', perqAmountInput('creditOfficialExpenses'))}
                  </>
                )}

                {perqSection(
                  '9. Club Expenses',
                  perquisiteCalculatedAmounts.clubExpenses,
                  'total expenses - official expenses',
                  <>
                    {perqField('Total Expenses', perqAmountInput('clubTotalExpenses'))}
                    {perqField('Official Expenses', perqAmountInput('clubOfficialExpenses'))}
                  </>
                )}

                {perqSection(
                  '10. Gift Taxable Portion',
                  perquisiteCalculatedAmounts.giftTaxablePortion,
                  'total gift value - 5000. If <= 5000, taxable value is 0.',
                  <>{perqField('Total Gift Value', perqAmountInput('giftTotalValue'))}</>
                )}

                {perqSection(
                  '11. Use / Transfer of Assets',
                  perquisiteCalculatedAmounts.useTransferOfAssets,
                  'Use: 10% asset cost - recovered. Transfer: depreciated value - recovered.',
                  <>
                    {perqField(
                      'Type',
                      perqRadioGroup('assetTypeMode', [
                        ['use', 'Use'],
                        ['transfer', 'Transfer'],
                      ])
                    )}
                    {perqField(
                      'Asset Type',
                      perqRadioGroup('assetKind', [
                        ['computer', 'Computer'],
                        ['car', 'Car'],
                        ['other', 'Other'],
                      ], 'sm:grid-cols-3')
                    )}
                    {perqField('Cost of Asset', perqAmountInput('assetCost'))}
                    {perqField('Years Used', perqAmountInput('assetYearsUsed'))}
                    {perqField('Amount Recovered', perqAmountInput('assetAmountRecovered'))}
                  </>
                )}

                {perqSection(
                  '12. Employer Contribution',
                  perquisiteCalculatedAmounts.employerContribution,
                  '(PF + NPS + superannuation + interest/accretion) - 750000',
                  <>
                    {perqField('PF Contribution', perqAmountInput('pfContribution'))}
                    {perqField('NPS Contribution', perqAmountInput('npsContribution'))}
                    {perqField('Superannuation', perqAmountInput('superannuationContribution'))}
                    {perqField('Interest / Accretion', perqAmountInput('interestAccretion'))}
                  </>
                )}

                {perqSection(
                  '13. Other Perquisites',
                  perquisiteCalculatedAmounts.otherPerquisites,
                  'amount paid - amount recovered',
                  <>
                    {perqField('Nature of Benefit', perqTextInput('otherNatureOfBenefit'))}
                    {perqField('Amount Paid', perqAmountInput('otherAmountPaid'))}
                    {perqField('Amount Recovered', perqAmountInput('otherAmountRecovered'))}
                  </>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-gray-500">
                  This page closes after Save and Continue.
                </p>
                <button
                  type="button"
                  onClick={handlePerquisitesBreakdownSave}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  Save and Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProfitsBreakdownPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Profits in Lieu of Salary U/S 17(3)
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Enter each receipt. Total (C) is calculated automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProfitsBreakdownPopup(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="p-6">
              <div className="overflow-hidden rounded-2xl border border-gray-200">
                <table className="w-full border-collapse text-sm md:text-base">
                  <tbody>
                    <tr className="bg-gray-50">
                      <td
                        colSpan={2}
                        className="border-b border-gray-200 px-4 py-4 text-center text-lg font-bold text-gray-900"
                      >
                        3. PROFITS IN LIEU OF SALARY U/S 17(3)
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border-b border-gray-200 px-4 py-3 font-bold text-gray-700">
                        PARTICULARS
                      </td>
                      <td className="border-b border-l border-gray-200 px-4 py-3 text-center font-bold text-gray-700">
                        AMOUNT
                      </td>
                    </tr>
                    {profitsBreakdownRows.map(([label, value, setter, fieldKey]) => (
                      <tr key={fieldKey}>
                        <td className="border-b border-gray-200 px-4 py-4 font-semibold text-gray-800">
                          {label}
                        </td>
                        <td className="border-b border-l border-gray-200 px-4 py-2">
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                            className={detailInputClass(fieldKey)}
                            placeholder="ENTER AMOUNT"
                          />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50">
                      <td className="px-4 py-4 font-bold text-gray-900">TOTAL (C)</td>
                      <td className="border-l border-gray-200 px-4 py-4 text-right font-bold text-gray-900">
                        {formatMoney(profitsBreakdownTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-gray-500">
                  This page closes after Save and Continue.
                </p>
                <button
                  type="button"
                  onClick={handleProfitsBreakdownSave}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  Save and Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExemptionsBreakdownPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Exemptions U/S 10</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Enter each exemption. Total Exemptions (D) is calculated automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExemptionsBreakdownPopup(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="p-6">
              <div className="overflow-hidden rounded-2xl border border-gray-200">
                <table className="w-full border-collapse text-sm md:text-base">
                  <tbody>
                    <tr className="bg-gray-50">
                      <td
                        colSpan={2}
                        className="border-b border-gray-200 px-4 py-4 text-center text-lg font-bold text-gray-900"
                      >
                        4. LESS: EXEMPTIONS U/S 10
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border-b border-gray-200 px-4 py-3 font-bold text-gray-700">
                        PARTICULARS
                      </td>
                      <td className="border-b border-l border-gray-200 px-4 py-3 text-center font-bold text-gray-700">
                        AMOUNT
                      </td>
                    </tr>
                    {exemptionsBreakdownRows.map(([label, value, setter, fieldKey]) => (
                      <tr key={fieldKey}>
                        <td className="border-b border-gray-200 px-4 py-4 font-semibold text-gray-800">
                          {label}
                        </td>
                        <td className="border-b border-l border-gray-200 px-4 py-2">
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                            className={detailInputClass(fieldKey)}
                            placeholder="ENTER AMOUNT"
                          />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50">
                      <td className="px-4 py-4 font-bold text-gray-900">TOTAL EXEMPTIONS (D)</td>
                      <td className="border-l border-gray-200 px-4 py-4 text-right font-bold text-gray-900">
                        {formatMoney(exemptionsBreakdownTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-gray-500">
                  This page closes after Save and Continue.
                </p>
                <button
                  type="button"
                  onClick={handleExemptionsBreakdownSave}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  Save and Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeductions16BreakdownPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Deductions U/S 16</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Enter each deduction. Total Deductions (E) is calculated automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeductions16BreakdownPopup(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="p-6">
              <div className="overflow-hidden rounded-2xl border border-gray-200">
                <table className="w-full border-collapse text-sm md:text-base">
                  <tbody>
                    <tr className="bg-gray-50">
                      <td
                        colSpan={2}
                        className="border-b border-gray-200 px-4 py-4 text-center text-lg font-bold text-gray-900"
                      >
                        5. LESS: DEDUCTIONS U/S 16
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border-b border-gray-200 px-4 py-3 font-bold text-gray-700">
                        PARTICULARS
                      </td>
                      <td className="border-b border-l border-gray-200 px-4 py-3 text-center font-bold text-gray-700">
                        AMOUNT
                      </td>
                    </tr>
                    {deductions16BreakdownRows.map(([label, value, setter, fieldKey]) => (
                      <tr key={fieldKey}>
                        <td className="border-b border-gray-200 px-4 py-4 font-semibold text-gray-800">
                          {label}
                        </td>
                        <td className="border-b border-l border-gray-200 px-4 py-2">
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                            className={detailInputClass(fieldKey)}
                            placeholder="ENTER AMOUNT"
                          />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50">
                      <td className="px-4 py-4 font-bold text-gray-900">TOTAL DEDUCTIONS (E)</td>
                      <td className="border-l border-gray-200 px-4 py-4 text-right font-bold text-gray-900">
                        {formatMoney(deductions16BreakdownTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-gray-500">
                  This page closes after Save and Continue.
                </p>
                <button
                  type="button"
                  onClick={handleDeductions16BreakdownSave}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  Save and Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
