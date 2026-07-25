"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardList,
  FileText,
  FolderOpen,
  HelpCircle,
  Import,
  Lock,
  Menu,
  PiggyBank,
  ShieldAlert,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/app/_contexts/AuthContext";
import type { SessionUser } from "@/app/_utils/authSession";
import type { ActivityItem, FilingStep, User as DashboardUser } from "../_hooks/useTaxDashboardData";

type NavItem = {
  icon: LucideIcon;
  label: string;
  route: string;
};

export const sidebarItemsDefault: NavItem[] = [
  { icon: BarChart3, label: "Dashboard", route: "/dashboard" },
  { icon: FileText, label: "File Tax", route: "/file-tax" },
  { icon: PiggyBank, label: "Tax Savings", route: "/tax-savings" },
  { icon: FolderOpen, label: "Documents", route: "/documents" },
  { icon: Sparkles, label: "Insights", route: "/insights" },
  { icon: HelpCircle, label: "Help", route: "/help" },
];

export function DashboardShell({
  user,
  onLogout,
  children,
}: {
  user: DashboardUser;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <WorkspaceShell
      title="Dashboard"
      subtitle="A unified workspace for filing, documents, savings, and insights."
      user={user}
      onLogout={onLogout}
    >
      {children}
    </WorkspaceShell>
  );
}

export type WorkspaceNavItem = {
  icon: LucideIcon;
  label: string;
  route: string;
};

export type WorkspaceShellProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  sidebarItems?: WorkspaceNavItem[];
  sidebarTitle?: string;
  sidebarSubtitle?: string;
  user?: Partial<SessionUser>;
  onLogout?: () => void;
  search?: ReactNode;
  headerRight?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function WorkspaceShell({
  title,
  subtitle,
  actions,
  breadcrumbs,
  sidebarItems,
  sidebarTitle,
  sidebarSubtitle,
  user,
  onLogout,
  search,
  headerRight,
  footer,
  children,
}: WorkspaceShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const normalizedPathname = pathname?.replace(/\/+$/, "") || "/";
  const effectiveSidebarItems = sidebarItems ?? sidebarItemsDefault;
  const effectiveSidebarTitle = sidebarTitle ?? "TaxBee";
  const effectiveSidebarSubtitle = sidebarSubtitle ?? "Personal tax workspace";
  const auth = useAuth();
  const shellUser = user ?? auth.user ?? undefined;
  const displayName = shellUser?.name || (auth.status === "loading" ? "Loading..." : "User");
  const displayEmail = shellUser?.email || (auth.status === "loading" ? "Checking session" : "Signed in");
  const workspaceLabel = shellUser?.role ? `${shellUser.role.charAt(0).toUpperCase()}${shellUser.role.slice(1)} workspace` : "TaxBee workspace";

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-gray-700 lg:flex">
      <aside className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-[#0f172a] px-4 py-3 text-white lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r lg:border-gray-800 lg:px-4 lg:py-5">
        <div className="flex items-center justify-between gap-3 lg:mb-7">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex min-w-0 items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-white/10 lg:w-full lg:bg-white/5 lg:p-3 lg:ring-1 lg:ring-white/10"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-2 ring-yellow-400">
              <Image
                src="/logo.jpg"
                alt="TaxBee logo"
                width={44}
                height={44}
                className="h-full w-full object-cover"
                priority
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lg font-bold text-white">{effectiveSidebarTitle}</span>
              <span className="hidden text-sm font-semibold text-gray-400 sm:block">{effectiveSidebarSubtitle}</span>
            </span>
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10 lg:hidden"
            onClick={() => router.push("/dashboard")}
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="mt-3 flex gap-1 overflow-x-auto pb-1 lg:mt-0 lg:flex-col lg:overflow-visible lg:pb-0">
          {effectiveSidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = normalizedPathname === item.route;
            return (
              <button
                key={item.label}
                onClick={() => router.push(item.route)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition lg:w-full ${
                  isActive
                    ? "bg-yellow-400 text-gray-950"
                    : "text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-6 hidden rounded-2xl border border-white/10 bg-white/5 p-3 lg:block">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
              <UserIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-300">{displayName}</p>
              <p className="truncate text-xs text-gray-500">{displayEmail}</p>
              <p className="truncate text-xs text-gray-500">{workspaceLabel}</p>
            </div>
          </div>
          {onLogout ? (
            <button
              onClick={onLogout}
              className="mt-3 w-full rounded-xl border border-red-400/20 px-3 py-2 text-left text-sm font-semibold text-red-300 transition hover:bg-white/10"
            >
              Logout
            </button>
          ) : null}
        </div>
      </aside>

      <main className="w-full px-4 pb-8 pt-36 sm:px-6 lg:ml-64 lg:px-8 lg:pt-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <header className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                {title && <h1 className="text-3xl font-bold text-gray-900">{title}</h1>}
                {subtitle && <p className="mt-2 text-sm leading-6 text-gray-600">{subtitle}</p>}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {search && <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">{search}</div>}
                {actions}
                {headerRight}
              </div>
            </div>

            {breadcrumbs ? (
              <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
                {breadcrumbs.map((crumb, index) => (
                  <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-2">
                    {crumb.href ? (
                      <button
                        type="button"
                        className="text-slate-500 transition hover:text-slate-700"
                        onClick={() => crumb.href && router.push(crumb.href)}
                      >
                        {crumb.label}
                      </button>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                    {index < breadcrumbs.length - 1 ? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  </span>
                ))}
              </nav>
            ) : null}
          </header>

          {children}

          {footer ? <footer>{footer}</footer> : null}
        </div>
      </main>
    </div>
  );
}

export function LoadingDashboard() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-semibold text-gray-700 shadow-sm">
        Loading dashboard...
      </div>
    </div>
  );
}

export function PageSection({
  title,
  description,
  action,
  children,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      {(title || description || action) && (
        <div className="mb-5 flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title && <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{title}</h2>}
            {description && <p className="mt-1 text-sm leading-6 text-gray-600">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function DashboardHero({
  userName,
  selectedYear,
  verifiedPan,
  subscriptionStatus,
  notice,
}: {
  userName: string;
  selectedYear: string;
  verifiedPan: string | null;
  subscriptionStatus: string;
  notice?: string;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Welcome {userName || "User"}
          </h1>
          <p className="mt-2 text-base font-semibold text-gray-700">
            FY {selectedYear} <span className="text-gray-400">|</span>{" "}
            {verifiedPan ? "PAN Verified" : "PAN Not Verified"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-xl border border-gray-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-gray-700">
            {verifiedPan || "PAN pending"}
          </span>
          <span className="rounded-xl border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm font-bold text-gray-900">
            {subscriptionStatus}
          </span>
        </div>
      </div>
      {notice && (
        <p className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700">
          {notice}
        </p>
      )}
    </section>
  );
}

export function StatCard({
  label,
  value,
  description,
  toneClassName = "text-gray-900",
}: {
  label: string;
  value: string;
  description: string;
  toneClassName?: string;
}) {
  return (
    <article className="flex min-h-40 flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-gray-900">{label}</p>
      <div>
        <p className={`mt-4 text-3xl font-bold leading-tight ${toneClassName}`}>{value}</p>
        <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
      </div>
    </article>
  );
}

export function ActionCenterCard({
  title,
  detail,
  saving,
  riskReduction,
  cta,
  onAction,
}: {
  title: string;
  detail: string;
  saving: string;
  riskReduction: string;
  cta: string;
  onAction: () => void;
}) {
  return (
    <section className="rounded-2xl border border-yellow-300 bg-yellow-50 p-5 shadow-sm sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-end">
        <div>
          <p className="text-sm font-bold text-gray-900">Best Action Right Now</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{title}</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-700">{detail}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-yellow-300 bg-white p-4">
            <p className="text-sm font-semibold text-gray-600">Potential Impact</p>
            <p className="mt-2 text-2xl font-bold text-green-600">{saving}</p>
          </div>
          <div className="rounded-2xl border border-yellow-300 bg-white p-4">
            <p className="text-sm font-semibold text-gray-600">Risk Reduction</p>
            <p className="mt-2 text-2xl font-bold text-orange-500">{riskReduction}</p>
          </div>
        </div>
      </div>
      <button
        onClick={onAction}
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
      >
        {cta}
      </button>
    </section>
  );
}

export function QuickActions({
  onNavigate,
}: {
  onNavigate: (route: string) => void;
}) {
  const actions = [
    { icon: FileText, label: "File ITR", route: "/file-your-itr" },
    { icon: Import, label: "Import Data", route: "/import-data" },
    { icon: FolderOpen, label: "Documents", route: "/documents" },
    { icon: PiggyBank, label: "Tax Savings", route: "/tax-savings" },
    { icon: HelpCircle, label: "Help", route: "/help" },
  ];

  return (
    <PageSection title="Quick Actions">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => onNavigate(item.route)}
              className="flex min-h-20 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm font-bold text-gray-900 transition hover:border-yellow-300 hover:bg-yellow-50"
            >
              <Icon className="h-4 w-4 text-gray-700" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </PageSection>
  );
}

export function FilingProgress({
  steps,
  onNavigate,
}: {
  steps: FilingStep[];
  onNavigate: (route: string) => void;
}) {
  const statusClass = {
    Done: "border-green-600 bg-green-600 text-white",
    "In Progress": "border-blue-600 bg-blue-600 text-white",
    Pending: "border-gray-300 bg-white text-gray-500",
    Locked: "border-gray-300 bg-slate-100 text-gray-400",
  };

  return (
    <PageSection title="Filing Progress" description="A compact view of where your return stands today.">
      <div className="grid gap-3 lg:grid-cols-4">
        {steps.map((step, index) => {
          const isLocked = step.status === "Locked";
          const Icon = isLocked ? Lock : step.status === "Done" ? CheckCircle2 : Circle;
          return (
            <button
              key={step.title}
              onClick={() => !isLocked && onNavigate(step.route)}
              className="group rounded-2xl border border-gray-200 bg-slate-50 p-4 text-left transition hover:border-yellow-300 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-slate-50"
              disabled={isLocked}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full border ${statusClass[step.status]}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-semibold text-gray-700">
                  {step.status}
                </span>
              </div>
              <h3 className="mt-4 font-bold text-gray-900">
                {index + 1}. {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{step.detail}</p>
            </button>
          );
        })}
      </div>
    </PageSection>
  );
}

export function RecentActivity({ activities }: { activities: ActivityItem[] }) {
  return (
    <PageSection title="Recent Activity">
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.title} className="flex gap-3">
            <span
              className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                activity.status === "done"
                  ? "border-green-600 bg-green-50 text-green-600"
                  : "border-gray-300 bg-slate-50 text-gray-400"
              }`}
            >
              {activity.status === "done" ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 border-b border-gray-100 pb-4 last:border-b-0">
              <p className="font-bold text-gray-900">{activity.title}</p>
              <p className="mt-1 text-sm leading-6 text-gray-600">{activity.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </PageSection>
  );
}

export function InsightsPreview({
  savingsSummary,
  riskSummary,
  regimeSummary,
  onViewDetails,
}: {
  savingsSummary: string;
  riskSummary: string;
  regimeSummary: string;
  onViewDetails: () => void;
}) {
  const cards = [
    { icon: PiggyBank, title: "Tax Savings Opportunity", summary: savingsSummary },
    { icon: ShieldAlert, title: "Potential Risk", summary: riskSummary },
    { icon: ClipboardList, title: "Recommended Regime", summary: regimeSummary },
  ];

  return (
    <PageSection title="Insights Preview" description="Only the highest-signal tax intelligence is shown here.">
      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 ring-1 ring-gray-200">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-bold text-gray-900">{card.title}</h3>
              <p className="mt-2 min-h-16 text-sm leading-6 text-gray-600">{card.summary}</p>
              <button
                onClick={onViewDetails}
                className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-900 transition hover:border-yellow-300 hover:bg-yellow-50"
              >
                View details
              </button>
            </article>
          );
        })}
      </div>
    </PageSection>
  );
}


