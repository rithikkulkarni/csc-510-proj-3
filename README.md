# PROJECT 3 README: GROUP 10 EXTENDING MEALSLOT
[![Coverage Status](https://coveralls.io/repos/github/rithikkulkarni/csc-510-proj-3/badge.svg?branch=main)](https://coveralls.io/github/rithikkulkarni/csc-510-proj-3?branch=main)
[![Lint](https://github.com/rithikkulkarni/csc-510-proj-3/actions/workflows/lint.yml/badge.svg?branch=main)](https://github.com/rithikkulkarni/csc-510-proj-3/actions/workflows/lint.yml)
[![GitHub issues](https://img.shields.io/github/issues/rithikkulkarni/csc-510-proj-3)](https://github.com/rithikkulkarni/csc-510-proj-3/issues)
[![Open Pull Requests](https://img.shields.io/github/issues-pr/rithikkulkarni/csc-510-proj-3)](https://github.com/rithikkulkarni/csc-510-proj-3/pulls)
[![Contributors](https://img.shields.io/github/contributors/rithikkulkarni/csc-510-proj-3)](https://github.com/rithikkulkarni/csc-510-proj-3/graphs/contributors)
[![Last Commit](https://img.shields.io/github/last-commit/rithikkulkarni/csc-510-proj-3)](https://github.com/rithikkulkarni/csc-510-proj-3/commits)



![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Release](https://img.shields.io/github/v/release/rithikkulkarni/csc-510-proj-3)
[![DOI](https://zenodo.org/badge/1097253739.svg)](https://doi.org/10.5281/zenodo.17795085)

Rubric Self-Evaluation:
|Notes|Evidence|Score|
|-----|---------|--|
|Workload is spread over the whole team (one team member is often Xtimes more productive than the others... --| |3|
but nevertheless, here is a track record that everyone is contributing a lot)|evidence in GH|3|
|Number of commits|in GH|3|
|Number of commits: by different people|in GH|3|
|Issues reports: there are **many**| |3|
|Issues are being closed|evidence in GH|3|
|Docs: doco generated, format not ugly |in GH|3|
|Docs: what: point descriptions of each class/function (in isolation)| |3|
|Docs: how: for common use cases X,Y,Z mini-tutorials showing worked examples on how to do X,Y,Z|wiki pages for this in GH: https://github.com/rithikkulkarni/csc-510-proj-2/wiki|3|
|Docs: why: docs tell a story, motivate the whole thing, deliver a punchline that makes you want to rush out and use the thing| |3|
|Docs: short video, animated, hosted on your repo. That convinces people why they want to work on your code.| |3|
|Use of version control tools| |3|
|Test cases exist|dozens of tests and those test cases are more than 30% of the code base|3|
|Test cases are routinely executed|E.g. travis-com.com or github actions or something|3|
|Issues are discussed before they are closed|even if you discuss in slack, need a sumamry statement here|3|
|Chat channel: exists|[Link or screenshots](https://docs.google.com/document/d/1A-Fz2_Rlq_VkqLixtLzNbw1e78-GV-K-3JCpCpqh3bw/edit?usp=sharing)|3|
|Test cases: a large proportion of the issues related to handling failing cases.|If a test case fails, open an issue and fix it|3|
|Evidence that the whole team is using the same tools: everyone can get to all tools and files| |3|
|Evidence that the whole team is using the same tools (e.g. config files in the repo, updated by lots of different people)| |3|
|Evidence that the whole team is using the same tools (e.g. tutor can ask anyone to share screen, they demonstrate the system running on their computer)| |3|
|Evidence that the members of the team are working across multiple places in the code base| |3|
|Short release cycles | (hard to see in short projects) project members are committing often enough so that everyone can get your work|3|
|The file .gitignore lists what files should not be saved to the repo. See [examples](https://github.com/github/gitignore)|in GH|3|
|The file INSTALL.md lists how to install the code|in GH|3|
|The file LICENSE.md lists rules of usage for this repo|in GH|3|
|The file CODE-OF-CONDUCT.md lists rules of behavior for this repo; e.g. see [example](https://github.com/probot/template/blob/master/CODE_OF_CONDUCT.md)|in GH|3|
|The file CONTRIBUTING.md lists coding standards and lots of tips on how to extend the system without screwing things up; e.g. see [example](https://github.com/probot/template/blob/master/CONTRIBUTING.md)|in GH|3|
|The file README.md contains all the following|in GH|3|
|Video|2min video of new functionality, showing a significant delta from prior.| |3|
|DOI badge: exists. To get a Digitial Object Indentifier, regiser the project at [Zenodo](https://docs.github.com/en/repositories/archiving-a-github-repository/referencing-and-citing-content). DOI badges look like this: ![Zenodo doi badge](https://img.shields.io/badge/DOI-10.5281%2Fzenodo.1234567-blue.svg) |in GH|3|
|Badges showing your style checkers |config files in GH, Lint workflow + badge in README (Prettier with Lint)|3|
|Badges showing your code formatters. |config files in GH, Lint workflow + badge in README|3|
|Badges showing your syntax checkers. |config files in GH|3|
|Badges showing your code coverage tools|config files in GH, coveralls badge in README|3|
|Badges showing any other Other automated analysis tools| |3|
| ||


# MealSlot

*Decisions are hard. Meal planning shouldn't be.*

<!-- Optional logo if you have one -->
<!-- <img src="./public/mealslot-logo.png" alt="MealSlot Logo" width="70" height="70"> -->

[📺 **WATCH THE DEMO VIDEO!**](./MealSlot_Demo.mp4)

## Group Members (G10)

- Rithik Kulkarni (rrkulka3)
- Shiva Gadireddy (sgadire)
- Ananya Rao (arrao3)
- Natasha Wolsborn (njwolsbo)

Project 3 repository for **CSC 510 - Fall 2025**

---

## 1. Project Overview

MealSlot helps users discover new culinary experiences by **gamifying the process of choosing a meal**.

Core capabilities:

- 🎰 **Randomized Meal Choices** – Slot machine UI lets users pick meal categories and constraints, then generates randomized meals with recipes and nearby venues.
- 🍳 **Cook at Home (Recipes)** – Fetches multiple recipe ideas for each dish with **YouTube video** links.
- 📍 **Eat Out (Nearby Restaurants)** – Uses the **Google Places API** to find restaurants that serve meals similar to the selected dishes.
- 🎉 **Party Spins** – Users can create parties to coordinate meal planning as a group.
- 📅 **Complex Spins / Full-Day Plans** – Spin across multiple categories (e.g., breakfast, lunch, dinner, dessert) to build randomized full-day meal plans.
- 👤 **User System** – Authenticated users can sign up/login, view history, change profile image and username, and store dietary preferences for all future spins.
- ❤️ **Saved Meals** – Users can “heart” meals and revisit them via their account page.
- ✨ **UI Enhancements** – Custom color scheme, animations, and polished layout, optimized for both solo and party flows.

---

## 2. Developer Handbook

> This section covers linting, formatting, testing, coverage, and database usage with **ESLint**, **Prettier**, **Vitest**, **Prisma**, and **Neon Postgres**.

---

### 2.1 Prerequisites (Quick Start)

```bash
git clone https://github.com/rithikkulkarni/csc-510-proj-3.git
cd proj2/mealslot # This proj2 root is from the forked repository - it still resembles the original creators' structure.
pnpm install

# Set up your .env.local (see below), then:
pnpm run dev
```

By default, the app runs at `http://localhost:3000`.

---

### 2.2 Code Quality: ESLint

This project uses:

- **ESLint** – static analysis and style rules
- **TypeScript** – type safety

#### Install / verify dependencies

```bash
pnpm i -D eslint prettier eslint-config-next eslint-config-prettier eslint-plugin-prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

#### Lint commands

```bash
# Run lint
npm run lint

# Auto-fix fixable issues
npm run lint:fix
```

Suggested `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier . --write",
    "format:check": "prettier . --check"
  }
}
```

---

### 2.3 Testing (Vitest & React Testing Library)

We use **Vitest** for tests and **React Testing Library** for React components.

#### Test dependencies

```bash
npm i -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

#### `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      all: true,
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      exclude: [
        'node_modules/',
        '.next/',
        'out/',
        'coverage/',
        '**/*.d.ts',
        '**/vitest.setup.ts',
        '**/vitest.config.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

#### `vitest.setup.ts`

```ts
import '@testing-library/jest-dom';
import fetch from 'node-fetch';
import { vi } from 'vitest';

// Only needed if Node < 18
if (!globalThis.fetch) {
  // @ts-ignore
  globalThis.fetch = fetch;
}

// Example: mock next/font/google if you use it
vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'font-geist-sans' }),
  Geist_Mono: () => ({ variable: 'font-geist-mono' })
}));
```

#### Example test

```tsx
import { render, screen } from '@testing-library/react';
import HomePage from '@/app/(solo)/page';

test('renders MealSlot heading', () => {
  render(<HomePage />);
  expect(
    screen.getByRole('heading', { name: /what should we eat today/i })
  ).toBeInTheDocument();
});
```

#### Test scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage"
  }
}
```

Run tests with coverage:

```bash
pnpm run test:coverage
```

---

#### Coveralls Integration

Create a **Coveralls** project for this repo.

**`.github/workflows/coverage.yml`**

```yaml
name: coverage

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: proj2/mealslot

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9
          run_install: false

      - name: Install dependencies
        run: pnpm install

      - name: Run Vitest with coverage
        run: pnpm test:coverage

      - name: Upload coverage to Coveralls
        uses: coverallsapp/github-action@v2
        with:
          files: proj2/mealslot/coverage/lcov.info
          fail_ci_if_error: true
```

#### CI: ESLint

**`.github/workflows/lint.yml`**

```yaml
name: lint

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  eslint:
    name: Run ESLint
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: proj2/mealslot

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '24'   # match coverage.yml (or your actual Node version)

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9
          run_install: false

      - name: Install deps
        run: pnpm install

      - name: Run ESLint
        run: pnpm lint         # or `pnpm run lint` depending on your script name
```

---

## 3. Database: Prisma + Neon (Postgres)

MealSlot uses **Prisma** as the ORM and **Neon** as the managed Postgres database.

Typical setup:

1. Create a Neon Postgres project and database.
2. Copy the connection string into `.env.local`:

```bash
DATABASE_URL="postgresql://<user>:<password>@<neon-host>/<db>?sslmode=require"
```

3. Define your models in `prisma/schema.prisma` (e.g., users, dishes, sessions/parties, spins, savedMeals, allergens).
4. Run migrations:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

5. (Optional) Seed data:

```bash
npx prisma db seed
```

Example Prisma client helper:

```ts
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'info', 'warn', 'error']
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

---

## 4. Auth & Environment Variables

MealSlot supports login with **Google**, **GitHub**, and email/password. Common environment variables (adjust names to match your actual implementation):

```bash
# Database
DATABASE_URL=postgresql://...

# Auth (e.g., NextAuth)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret

# External APIs
YOUTUBE_API_KEY=your-youtube-api-key
MAPS_API_KEY=your-places-api-key
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your-places-api-key # Used twice for different levels of visibility
```

These keys must **not** be committed; keep them in `.env.local` and configure them in your deployment platform (e.g., Vercel).

---

## 5. External Integrations

### 5.1 YouTube API (Recipes)

- Given a dish name, MealSlot queries the YouTube Data API for recipe videos.
- Results are surfaced in a **“Cook at Home”** panel/modal with video thumbnails, titles, and links.

### 5.2 Google Places API (Eat Out)

- Given a dish name or cuisine, MealSlot looks up nearby restaurants using **Google Places**.
- Used in the **“Eat Outside”** flow.

---

## 6. How to Contribute

See `CONTRIBUTING.md` for:

- Branching and PR workflow
- Coding standards (ESLint + Prettier)
- Commit message conventions
- How to add new features without breaking existing flows

---

## 7. License

See `LICENSE.md` for usage rules and licensing details.

---

## 8. Acknowledgements

- CSC 510 staff and course materials
- Prisma and Neon teams for tooling
- YouTube and Google Places APIs for external data
- Team G10 for design, implementation, and polish
