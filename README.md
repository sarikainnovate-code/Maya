# Maya — AI Teacher (integrated product)

Teacher Studio plans the lesson (curriculum, grade, subject, topic) → Learner View
teaches it live with the photorealistic Maya (Tavus) + topic-matched visual aids.
Stateless: Maya remembers nothing about the speaker.

## How it works

- `server.js` (plain Node.js, zero dependencies) keeps your `TAVUS_API_KEY`
  server-side. The browser never sees it.
- `GET /api/lessons` serves the lesson catalog (`lessons.json`).
- `POST /api/conversation` mints a fresh Tavus conversation URL via
  `https://tavusapi.com/v2/conversations`, injecting curriculum/grade/subject/topic
  into the lesson context. Body: `{ lessonId, grade, curriculum, subject }`.
- `index.html` is the whole product: Teacher Studio view + Learner view.
  Deep link straight into a lesson: `/?lesson=heart&grade=5&curriculum=IB&subject=Science`
- `lessons.json` is the shared source of truth: add a topic once (context +
  visuals), and both Studio and Learner know it.

## Run locally

```bash
cd ~/workspace/tavus-maya-poc
cp .env.example .env   # then fill in TAVUS_API_KEY and TAVUS_PAL_ID
node server.js
```
Open http://localhost:3000 → pick curriculum/grade/subject → Start live lesson.

## Deploy to Render (free, ~5 minutes, in your name)

1. Create a GitHub account (if needed) → **New repository** → name it
   `maya-ai-teacher` → **uploading an existing file** → drag in every file from
   this folder (all files sit flat, no subfolders — just select them all).
   **Never upload `.env`.**
   Commit directly to main.
2. Create a Render account (render.com) → **New → Web Service** →
   **Connect GitHub** → pick `maya-ai-teacher`. Render reads `render.yaml`.
3. Before deploying, add environment variables:
   - `TAVUS_API_KEY` = your Tavus key (dashboard → API keys)
   - `TAVUS_PAL_ID` = `p744798a0b2d`
4. **Deploy.** You get a public URL like
   `https://maya-ai-teacher.onrender.com` — open it, plan a lesson, start Maya.
   (Free tier sleeps after inactivity; first load takes ~30s to wake up.)

## Maya persona prompt (paste into the PAL)

> You are Maya, a warm and professional Indian schoolteacher teaching Class 5
> science. Today's topic: the human heart. Explain what the heart does and its
> main parts (atria, ventricles, valves) with one short relatable story or
> analogy. Keep every response to 2–4 short sentences, in clear slow English.
> After each explanation ask ONE simple check-in question and wait for the
> answer. Praise effort warmly and encourage curiosity. If asked whether you are
> real, say you are Maya, an AI teacher, and that important facts should be
> checked with their real teacher.

## Costs

- POC: $0 (25 free CVI minutes/month on the Developer tier).
- Beyond free: overage ≈ $0.37/min on Starter — a 30-min classroom lesson ≈ $11.

## What's next (not in this POC)

- Custom sari-dressed teacher replica (paid tier, ~2 min video of a consenting adult).
- On-the-fly image generation for arbitrary topics.
- Classroom controls, parent visibility, safety guardrails.
