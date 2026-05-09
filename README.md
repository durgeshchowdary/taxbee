# TaxBee - AI-Powered Tax Intelligence

TaxBee is a high-precision tax computation and intelligence platform designed for the Indian financial landscape. It simplifies ITR filing using AI-driven suggestions and head-wise income tracking.

## 🚀 Tech Stack
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **UI Components:** Lucide React, Framer Motion
- **Math Engine:** High-precision arithmetic via `fraction.js`
- **Validation:** Zod
- **State:** React Hooks + Memoization

## 🛠️ Setup Instructions

1. **Clone & Install**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Copy `.env.example` to `.env.local` and populate the keys.
   ```bash
   cp .env.example .env.local
   ```

3. **Development**
   ```bash
   npm run dev
   ```

## 🏗️ Architecture
- `/app`: Next.js 15 App Router (Pages & Layouts)
- `/lib`: Shared utilities including the Tax Logic Engine
- `/components`: Reusable UI primitives
- `/backend`: (Mocked) API layer for JWT and OTP flows

## 🔒 Security Features
- **Context-Aware AI:** Backend-only AI calls to prevent prompt injection and leakages.
- **Input Sanitization:** Strict Zod validation on all user entry points.
- **Precision:** `fraction.js` prevents floating-point errors in tax slabs.

## 🗺️ Roadmap
- [x] Phase 7: Bee Assistant Contextual Bridge
- [x] Phase 8: Security Hardening (Zod + Validation)
- [ ] Phase 12: Real Document OCR (Form 16 / AIS)
- [ ] Phase 13: Direct e-filing Integration

---
Built with precision by the TaxBee Team.

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
