# Consistent Character Generator

An AI-powered storyboard generator that creates visually consistent character illustrations across scenes using **Google Gemini**. Built as a full-stack portfolio project.

![Stack](https://img.shields.io/badge/Stack-React_19_+_Express_+_SQLite-7c3aed?style=flat-square)
![AI](https://img.shields.io/badge/AI-Gemini_2.0_Flash-06b6d4?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square)

## Features

- **Multi-project dashboard** — Create and manage multiple storyboard projects
- **Character library** — Define characters with reference images and descriptions
- **AI scene generation** — Generate consistent character art for each scene via Gemini
- **Image gallery** — Browse all generated images across all projects
- **Download images** — Save individual or batch images
- **Persistent storage** — SQLite database (no external DB needed)
- **Secure API** — Gemini key stays server-side, never exposed to client

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router v6 |
| Backend | Express.js, TypeScript, tsx |
| Database | SQLite via sql.js (zero-native-deps) |
| AI | Google Gemini 2.0 Flash (image generation) |
| Dev | concurrently, react-hot-toast |

## Setup

### Prerequisites
- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/apikey)

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# 3. Start dev server (client on :3000, API on :3001)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build    # Vite builds frontend to dist/
npm start        # Express serves dist/ + API on :3001
```

## Project Structure

```
├── server/
│   ├── index.ts          # Express app
│   ├── db.ts             # SQLite setup & helpers
│   └── routes/
│       ├── projects.ts   # CRUD for projects
│       ├── characters.ts # CRUD for characters
│       ├── scenes.ts     # CRUD for scenes
│       └── generate.ts   # Gemini API proxy
└── src/
    ├── pages/
    │   ├── Home.tsx      # Landing page
    │   ├── Dashboard.tsx # Projects dashboard
    │   ├── Editor.tsx    # Storyboard editor
    │   └── Gallery.tsx   # Image gallery
    ├── components/       # Reusable UI components
    ├── services/api.ts   # Typed API client
    └── types/index.ts    # TypeScript interfaces
```

## How It Works

1. **Create a project** on the Dashboard
2. **Add characters** — name, description, and a reference photo
3. **Write scenes** — describe what happens in each scene
4. **Generate** — Gemini uses character references to produce consistent art
5. **Download** images or browse the Gallery

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key (required) |
| `PORT` | Server port (default: 3001) |
