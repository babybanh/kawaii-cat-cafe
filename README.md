# Kawaii Cat Cafe

A React, TypeScript, Vite, and Phaser project deployed through GitHub and Vercel.

## Start on a new Mac

### 1. Install Node.js

This project uses Node 24. The easiest beginner-friendly option is to install the current LTS version from [nodejs.org](https://nodejs.org/).

After installing, quit and reopen Terminal, then check:

```bash
node -v
npm -v
```

If you use `nvm`, this repo includes an `.nvmrc` file:

```bash
nvm install
nvm use
```

### 2. Download the project

```bash
git clone https://github.com/babybanh/kawaii-cat-cafe.git
cd kawaii-cat-cafe
```

### 3. Install dependencies

For everyday local setup:

```bash
npm install
```

For a clean install that exactly matches `package-lock.json`, especially on a fresh laptop or in CI:

```bash
npm ci
```

### 4. Run the app locally

```bash
npm run dev
```

Vite will print a local URL, usually `http://localhost:5173`. Open that URL in your browser.

## Useful commands

```bash
npm run dev      # Start the local dev server
npm run lint     # Check code style and common issues
npm test         # Run tests once
npm run build    # Create a production build in dist/
npm run preview  # Preview the production build locally
```

## GitHub workflow

Use branches for changes so the `main` branch stays publish-ready.

```bash
git checkout main
git pull
git checkout -b my-change
```

Make your edits, then run:

```bash
npm run lint
npm test
npm run build
```

Commit and push your branch:

```bash
git add .
git commit -m "Describe the change"
git push -u origin my-change
```

Open a pull request on GitHub. The CI workflow runs automatically on pull requests and on pushes to `main`.

## Vercel deployment workflow

This project is intended to use Vercel's Git integration instead of custom deploy scripts.

Recommended Vercel project settings:

- Framework preset: Vite
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Production branch: `main`

Day-to-day flow:

1. Push a branch to GitHub.
2. Open a pull request.
3. Vercel creates a Preview Deployment for that pull request.
4. Review the preview URL.
5. Merge to `main` when CI passes and the preview looks good.
6. Vercel deploys `main` to production.

Recommended GitHub repository settings:

- Require pull requests before merging into `main`.
- Require the CI workflow to pass before merging.
- Keep direct pushes to `main` limited or disabled.
