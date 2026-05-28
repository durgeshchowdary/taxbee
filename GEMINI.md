# TaxBee AI Assistant Rules

Project:
TaxBee AI-powered tax filing SaaS.

Current Goal:
Upgrade Bee Assistant into a mini Gemini-style AI copilot.

IMPORTANT ARCHITECTURE RULES:

- DO NOT create duplicate assistant systems.
- DO NOT create duplicate APIs.
- DO NOT create duplicate chat components.
- DO NOT rewrite existing auth system.
- DO NOT rewrite filing workflow engine.
- DO NOT create multiple intent systems.
- ALWAYS reuse existing backend APIs where possible.
- ALWAYS inspect existing files before creating new ones.
- ALWAYS extend existing architecture instead of replacing it.
- Maintain Next.js App Router architecture.
- Maintain existing Express.js backend structure.
- Keep existing JWT authentication flow.
- Keep existing TaxBee filing workflow logic.
- Keep current MongoDB models.
- Avoid unnecessary refactors.

UI Direction:
- Gemini-like AI assistant
- emotional intelligence
- conversation-first
- workflow-second
- glassmorphism
- premium light gradients
- modern AI SaaS design

Behavior Rules:
- casual conversation should NOT trigger filing workflow cards
- workflow cards should ONLY appear during filing-related intents
- greetings and emotional conversations should feel natural and human-like

Before editing:
1. Audit current related files
2. Explain planned changes
3. Then modify incrementally

Never create duplicates if an existing implementation already exists.