# Task Manager System

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)

A role-based task management application for organizing teams, projects, and tasks. Admins manage users and teams, managers oversee their team’s projects and work, and employees track their assigned tasks.

## Live demo

The project does not have a deployed demo yet. Add your deployment URLs here when available:

- **Frontend:** `https://YOUR-FRONTEND-URL`
- **Backend API:** `https://YOUR-BACKEND-URL`

## Features

- Role-based access for Admin, Manager, and Employee accounts
- Admin tools for viewing users, managing teams, and assigning team members
- Project creation, status tracking, and team-scoped project access
- Task creation, assignment, status updates, search, filters, and pagination
- CSV export of tasks using the active task filters
- Task comments and activity history
- Role-specific dashboards with task and team metrics
- Cookie-based authentication backed by JWT

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, Vite 6, React Router, Tailwind CSS 4, Axios, Recharts, Lucide React |
| Backend | Node.js, Express 5, JavaScript (CommonJS) |
| Database | MongoDB with Mongoose |
| Authentication | JSON Web Tokens stored in an HTTP-only cookie, bcrypt password hashing |

## Project structure

```text
Task Manager System/
├── backend/
│   ├── config/          # Database connection
│   ├── controllers/     # API handlers
│   ├── middleware/      # Authentication and authorization
│   ├── models/          # Mongoose models
│   ├── routes/          # Express routes
│   ├── scripts/         # Database seed script
│   ├── utils/           # Shared helpers
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/          # API client functions
│   │   ├── components/   # Shared UI components
│   │   ├── context/      # Authentication context
│   │   └── pages/        # Role-specific screens
│   └── package.json
└── README.md
```

## Installation

### Requirements

- Node.js and npm
- A MongoDB database, such as MongoDB Atlas or a local MongoDB instance

### 1. Set up the backend

From the project root, install the backend dependencies:

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
```

Start the API in development mode:

```bash
npm run dev
```

The API runs at `http://localhost:3000` by default.

To load the example users, teams, projects, and tasks into the configured database, run this in the `backend` directory:

```bash
npm run seed
```

### 2. Set up the frontend

Open another terminal from the project root:

```bash
cd frontend
npm install
```

Create `frontend/.env` and point it to the backend API:

```env
VITE_API_URL=http://localhost:3000/api
```

Start the frontend development server:

```bash
npm run dev
```

Vite serves the frontend at `http://localhost:5173` by default.

To create a production frontend build, run:

```bash
npm run build
```

## Environment variables

| Variable | Location | Required | Description |
| --- | --- | --- | --- |
| `PORT` | `backend/.env` | No | Backend port. Defaults to `5000`. |
| `MONGODB_URI` | `backend/.env` | Yes | MongoDB connection string. |
| `JWT_SECRET` | `backend/.env` | Yes | Secret used to sign and verify authentication tokens. |
| `JWT_EXPIRES_IN` | `backend/.env` | No | Token lifetime. Defaults to `1d`. |
| `VITE_API_URL` | `frontend/.env` | Recommended | Backend API base URL, including `/api`. Set to `http://localhost:3000/api` for the default local setup. |

Keep `.env` files and credentials out of source control. Only frontend variables prefixed with `VITE_` are available to browser code, so do not put secrets there.

## API endpoints

All endpoints are prefixed with `/api`. Protected endpoints require a valid login cookie. Access to records is restricted by role and team membership.

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/user/login` | Public | Sign in and receive the authentication cookie. |
| `POST` | `/user/logout` | Public | Clear the authentication cookie. |
| `GET` | `/user/me` | Authenticated | Get the current user. |
| `GET` | `/user` | Admin | List users. |
| `POST` | `/teams` | Admin | Create a team and assign its manager. |
| `GET` | `/teams` | Admin, Manager | List all teams (Admin) or the current manager’s team. |
| `GET` | `/teams/:id` | Admin, owning Manager | Get team details and members. |
| `PUT` | `/teams/:id` | Admin | Update team details or active status. |
| `POST` | `/teams/:id/members` | Admin | Add an employee to a team. |
| `DELETE` | `/teams/:id/members/:userId` | Admin | Remove an employee from a team. |
| `DELETE` | `/teams/:id` | Admin | Delete an eligible team. |
| `GET` | `/projects` | Authenticated | List projects accessible to the current user. Supports `search`, `status`, and `teamId` query filters. |
| `POST` | `/projects` | Admin, Manager | Create a project. Managers create projects for their own team. |
| `GET` | `/projects/:id` | Authenticated, authorized team | Get project details. |
| `PUT` | `/projects/:id` | Admin, authorized Manager | Update project details. |
| `PATCH` | `/projects/:id/status` | Admin, authorized Manager | Change project status. |
| `DELETE` | `/projects/:id` | Admin, authorized Manager | Delete a project when it has no tasks. |
| `GET` | `/tasks` | Authenticated | List accessible tasks. Supports `search`, `status`, `priority`, `projectId`, `assigneeId`, and pagination filters. |
| `GET` | `/tasks/export/csv` | Authenticated | Download accessible tasks as CSV. Supports `search`, `status`, and `priority`. |
| `POST` | `/tasks` | Admin, Manager | Create and assign a task. |
| `GET` | `/tasks/:id` | Authenticated, authorized task | Get task details. |
| `PUT` | `/tasks/:id` | Admin, Manager | Update task details or assignment. |
| `PATCH` | `/tasks/:id/status` | Authenticated, authorized task | Update task status. |
| `DELETE` | `/tasks/:id` | Admin, Manager | Delete a task. |
| `GET` | `/tasks/:taskId/comments` | Authenticated, authorized task | List task comments. |
| `POST` | `/tasks/:taskId/comments` | Authenticated, authorized task | Add a comment. |
| `PUT` | `/tasks/:taskId/comments/:commentId` | Comment author | Edit a comment. |
| `DELETE` | `/tasks/:taskId/comments/:commentId` | Comment author, Admin | Delete a comment. |
| `GET` | `/tasks/:taskId/activities` | Authenticated, authorized task | View task activity history. |
| `GET` | `/dashboard` | Authenticated | Get role-specific dashboard data. |

## Deployment notes

- Deploy the frontend and backend as separate services, and provide each service its own environment variables.
- Set `VITE_API_URL` to the deployed backend URL with the `/api` suffix, then rebuild the frontend.
- The backend currently allows credentialed CORS requests from `http://localhost:5173`. Update the CORS origin in `backend/server.js` to the deployed frontend origin before production deployment.
- Configure the backend cookie for HTTPS and the deployment’s cross-origin setup when frontend and backend use different sites.
- Restrict MongoDB network access to trusted hosts and use a strong, unique `JWT_SECRET`.
- Never deploy using sample seed credentials or commit database credentials to GitHub.

## Author

**Akhilesh**  
GitHub: [@akhilesh-yadav026](https://github.com/akhilesh-yadav026)
