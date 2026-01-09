# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HomeOps is a React Native mobile application (iOS/Android/Web) for household management. It helps families/roommates manage tasks, maintenance schedules, and finances collaboratively. The UI and content are in Portuguese (pt-BR).

## Development Commands

All commands should be run from the `homeops/` directory:

```bash
# Install dependencies
npm install

# Start development server
npm start                    # Expo start (choose platform)
npm run android              # Start on Android
npm run ios                  # Start on iOS
npm run web                  # Start web version

# Code quality
npm run lint                 # Run ESLint via Expo
npm run typecheck            # TypeScript type checking

# Build (requires EAS CLI and Expo account)
npm run build:dev:android    # Development build for Android
npm run build:dev:ios        # Development build for iOS
npm run build:preview:android  # Preview build (internal testing)
npm run build:prod:android   # Production build
```

## Environment Setup

Copy `.env.example` to `.env` and configure Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Architecture

### Tech Stack
- **Framework**: Expo 54 / React Native 0.81 / React 19
- **Navigation**: Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State**: Zustand stores
- **Backend**: Supabase (PostgreSQL + Auth)
- **Language**: TypeScript with strict mode

### Project Structure

```
homeops/
├── app/                    # Expo Router pages (file-based routing)
│   ├── (auth)/            # Auth screens (login, register)
│   ├── (tabs)/            # Main tab navigation (index, tasks, finances, maintenance)
│   ├── task/              # Task CRUD screens
│   ├── maintenance/       # Maintenance CRUD screens
│   ├── finance/           # Finance screens (bills, transactions)
│   └── settings/          # Settings & notifications
├── components/
│   ├── ui/                # Base UI components (Button, Card, Input, etc.)
│   ├── shared/            # Shared components (Header, EmptyState, Loading)
│   ├── tasks/             # Task-specific components
│   ├── maintenance/       # Maintenance-specific components
│   └── finances/          # Finance-specific components
├── stores/                # Zustand state stores
│   ├── authStore.ts       # Auth, user, household state
│   ├── taskStore.ts       # Tasks & categories
│   ├── maintenanceStore.ts # Maintenance items & history
│   └── financeStore.ts    # Bills, transactions, summaries
├── services/              # Business logic
│   └── notificationService.ts  # Local push notifications
├── lib/
│   └── supabase.ts        # Supabase client initialization
├── types/
│   └── index.ts           # All TypeScript interfaces
├── constants/
│   └── colors.ts          # Color palette
└── supabase/migrations/   # Database schema
```

### Key Patterns

**State Management**: Each domain has a Zustand store with fetch/create/update/delete operations. Stores fetch data filtered by `household_id` from Supabase.

**Routing**: Expo Router with route groups - `(auth)` for unauthenticated users, `(tabs)` for main app. Dynamic routes use `[id].tsx` pattern.

**Styling**: Use NativeWind classes (Tailwind syntax). Primary color is blue (#3B82F6). Import colors from `@/constants/colors`.

**Path Aliases**: Use `@/` prefix for imports (e.g., `@/stores/authStore`, `@/components/ui/Button`).

### Database Schema

The Supabase schema uses Row Level Security (RLS) to isolate data by household. Main tables:
- `households` - Multi-user household groups with invite codes
- `profiles` - User profiles linked to auth.users
- `tasks`, `task_categories`, `task_completions` - Task management
- `maintenance_items`, `maintenance_categories`, `maintenance_history` - Maintenance tracking
- `bills`, `transactions`, `finance_categories` - Financial management

Categories are pre-seeded as defaults and shared across all users (read-only).

### Error Handling

Auth errors from Supabase are translated to Portuguese in `authStore.ts`. User-facing error messages should be in Portuguese.
