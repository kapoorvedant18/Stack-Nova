The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Create a local environment file.
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS/Linux
cp .env.example .env

# Step 4: Fill values in .env
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_PUBLISHABLE_KEY
# - DATABASE_URL (optional if running without DB)

# Step 5: Install the necessary dependencies.
npm i

# Step 6: Start the frontend server with auto-reloading and an instant preview.
npm run dev

# Step 7: Start both frontend + backend at the same time.
npm run start
```

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
