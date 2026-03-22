# MSE-MOOC Frontend

React + TypeScript frontend for the new MSE-MOOC platform. The app now supports three role-specific workspaces: `student`, `teacher`, and `admin`.

## Features

- Vite + React + TypeScript
- React Router with dedicated routes:
  - `/login`
  - `/app/*` for students
  - `/teacher/*` for teachers
  - `/admin/*` for administrators
- `AuthContext` with access token, refresh token, current user and role
- Route guards for `student`, `teacher`, and `admin`
- Login + self-registration for `student` and `teacher`
- Admin login without self-registration in UI
- API client on top of `axios` with Bearer token injection
- Responsive UI for:
  - student catalog, my courses, my grades, profile
  - teacher courses, student groups, invite links, grading
  - admin dashboard, users, course moderation
- Mock fallback data so the interface stays usable before backend integration

## Run

```bash
npm install
npm run dev
```

Default local URL: `http://localhost:5173`.

## Build and quality

```bash
npm run lint
npm run build
npm run preview
```

## Environment

`.env.example` contains the gateway base URL.

```bash
VITE_API_BASE_URL=http://localhost:8080/api
```

## Backend endpoints expected by the UI

- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/refresh`
- `GET /auth/me`
- `GET /courses`
- `GET /users/{userId}/enrollments`
- `GET /teachers/{teacherId}/courses`
- `GET /teachers/{teacherId}/groups`
- `POST /groups`
- `POST /groups/{groupId}/invites`
- `POST /groups/join`
- `GET /students/{userId}/grades`
- `GET /teachers/{teacherId}/grades`
- `POST /grades`
- `GET /admin/users`
- `GET /admin/metrics`

## Structure

- `src/auth` - auth context and session management
- `src/api` - axios client, service functions, mock fallback data
- `src/components` - shared UI and route guards
- `src/pages/user` - student workspace
- `src/pages/teacher` - teacher workspace
- `src/pages/admin` - admin workspace
- `src/types` - shared TypeScript models

