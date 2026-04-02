# Manual Postman REST Tests

For the shortest reviewer path, use this file alongside `docs/REVIEWER-PACK.md`.

Use this file when you want to test the API manually in Postman without relying
on collection scripts.

Base environment:

- `baseUrl = http://localhost:4000/api/v1`

Recommended temporary values:

- `ownerName = Owner User`
- `ownerEmail = owner.manual@example.com`
- `ownerPassword = StrongPass1`
- `outsiderName = Outsider User`
- `outsiderEmail = outsider.manual@example.com`
- `outsiderPassword = StrongPass1`
- `projectName = Manual Launch Project`
- `projectDescription = Track launch tasks manually`
- `updatedProjectName = Manual Launch Project Updated`
- `taskTitle = Manual launch checklist`
- `taskDescription = Prepare go-live readiness checklist`
- `updatedTaskTitle = Manual launch checklist updated`
- `missingProjectId = missing-project-id`
- `missingTaskId = missing-task-id`
- `demoMemberEmail = demo.member@example.com`
- `demoAdminEmail = demo.admin@example.com`
- `demoPassword = DemoPass123!`

After successful requests, copy these values from the response into Postman
variables for later requests:

- `ownerAccessToken`
- `outsiderAccessToken`
- `projectId`
- `taskId`

## Demo Bootstrap

### 0. Seed Demo Data

- Method: `POST`
- URL: `{{baseUrl}}/seed/init`
- Headers: none
- Body: none

Expected status: `201`

Notes:

- backend must be running with `SEED_ENABLED=true`
- endpoint is intentionally unauthenticated in v1 but still blocked outside
  non-production environments

### 0.1 Login Seeded Demo Member

- Method: `POST`
- URL: `{{baseUrl}}/auth/login`
- Headers:
  - `Content-Type: application/json`
- Body:

```json
{
  "email": "{{demoMemberEmail}}",
  "password": "{{demoPassword}}"
}
```

Expected status: `200`

Demo checks after login:

- list projects and confirm two seeded projects are available
- open the primary project board and confirm `TODO`, `IN_PROGRESS`, and `DONE`
- open task `Finalize demo board narrative` and confirm activity logs appear

## Auth

### 1. Signup Owner

- Method: `POST`
- URL: `{{baseUrl}}/auth/signup`
- Headers:
  - `Content-Type: application/json`
- Body:

```json
{
  "name": "{{ownerName}}",
  "email": "{{ownerEmail}}",
  "password": "{{ownerPassword}}"
}
```

Expected status: `201`

Save:

- `data.accessToken` -> `ownerAccessToken`

### 2. Get Current User

- Method: `GET`
- URL: `{{baseUrl}}/auth/me`
- Headers:
  - `Authorization: Bearer {{ownerAccessToken}}`
- Body: none

Expected status: `200`

### 3. Refresh Owner Session

- Method: `POST`
- URL: `{{baseUrl}}/auth/refresh`
- Headers: none
- Body: none

Expected status: `201`

Save:

- `data.accessToken` -> `ownerAccessToken`

### 4. Signup Outsider

- Method: `POST`
- URL: `{{baseUrl}}/auth/signup`
- Headers:
  - `Content-Type: application/json`
- Body:

```json
{
  "name": "{{outsiderName}}",
  "email": "{{outsiderEmail}}",
  "password": "{{outsiderPassword}}"
}
```

Expected status: `201`

Save:

- `data.accessToken` -> `outsiderAccessToken`

### 5. Login Owner

- Method: `POST`
- URL: `{{baseUrl}}/auth/login`
- Headers:
  - `Content-Type: application/json`
- Body:

```json
{
  "email": "{{ownerEmail}}",
  "password": "{{ownerPassword}}"
}
```

Expected status: `200`

Save:

- `data.accessToken` -> `ownerAccessToken`

## Projects

### 6. Create Project

- Method: `POST`
- URL: `{{baseUrl}}/projects`
- Headers:
  - `Authorization: Bearer {{ownerAccessToken}}`
  - `Content-Type: application/json`
- Body:

```json
{
  "name": "{{projectName}}",
  "description": "{{projectDescription}}"
}
```

Expected status: `201`

Save:

- `data.id` -> `projectId`

### 7. List Projects

- Method: `GET`
- URL: `{{baseUrl}}/projects`
- Headers:
  - `Authorization: Bearer {{ownerAccessToken}}`
- Body: none

Expected status: `200`

### 8. Get Project Detail

- Method: `GET`
- URL: `{{baseUrl}}/projects/{{projectId}}`
- Headers:
  - `Authorization: Bearer {{ownerAccessToken}}`
- Body: none

Expected status: `200`

### 9. Update Project

- Method: `PUT`
- URL: `{{baseUrl}}/projects/{{projectId}}`
- Headers:
  - `Authorization: Bearer {{ownerAccessToken}}`
  - `Content-Type: application/json`
- Body:

```json
{
  "name": "{{updatedProjectName}}",
  "description": null
}
```

Expected status: `200`

### 10. Projects Require Auth

- Method: `GET`
- URL: `{{baseUrl}}/projects`
- Headers: none
- Body: none

Expected status: `401`

### 11. Forbidden Update As Outsider

- Method: `PUT`
- URL: `{{baseUrl}}/projects/{{projectId}}`
- Headers:
  - `Authorization: Bearer {{outsiderAccessToken}}`
  - `Content-Type: application/json`
- Body:

```json
{
  "name": "Outsider rename"
}
```

Expected status: `403`

### 12. Forbidden Delete As Outsider

- Method: `DELETE`
- URL: `{{baseUrl}}/projects/{{projectId}}`
- Headers:
  - `Authorization: Bearer {{outsiderAccessToken}}`
- Body: none

Expected status: `403`

### 13. Missing Project Detail

- Method: `GET`
- URL: `{{baseUrl}}/projects/{{missingProjectId}}`
- Headers:
  - `Authorization: Bearer {{ownerAccessToken}}`
- Body: none

Expected status: `404`

## Tasks

### 14. Create Task

- Method: `POST`
- URL: `{{baseUrl}}/projects/{{projectId}}/tasks`
- Headers:
  - `Authorization: Bearer {{ownerAccessToken}}`
  - `Content-Type: application/json`
- Body:

```json
{
  "title": "{{taskTitle}}",
  "description": "{{taskDescription}}",
  "status": "TODO",
  "dueDate": "2026-04-10"
}
```

Expected status: `201`

Save:

- `data.id` -> `taskId`

### 15. Load Project Task Groups

- Method: `GET`
- URL: `{{baseUrl}}/projects/{{projectId}}/tasks`
- Headers:
  - `Authorization: Bearer {{ownerAccessToken}}`
- Body: none

Expected status: `200`

Expected grouped payload:

- `data.taskGroups.TODO`
- `data.taskGroups.IN_PROGRESS`
- `data.taskGroups.DONE`

### 16. Get Task

- Method: `GET`
- URL: `{{baseUrl}}/tasks/{{taskId}}`
- Headers:
  - `Authorization: Bearer {{ownerAccessToken}}`
- Body: none

Expected status: `200`

### 17. Update Task

- Method: `PUT`
- URL: `{{baseUrl}}/tasks/{{taskId}}`
- Headers:
  - `Authorization: Bearer {{ownerAccessToken}}`
  - `Content-Type: application/json`
- Body:

```json
{
  "title": "{{updatedTaskTitle}}",
  "description": null,
  "dueDate": null
}
```

Expected status: `200`

### 18. Patch Task Status

- Method: `PATCH`
- URL: `{{baseUrl}}/tasks/{{taskId}}/status`
- Headers:
  - `Authorization: Bearer {{ownerAccessToken}}`
  - `Content-Type: application/json`
- Body:

```json
{
  "status": "DONE",
  "position": null
}
```

Expected status: `200`

Expected payload:

- `data.status`
- `data.position`
- `data.updatedAt`

### 19. Load Task Logs

- Method: `GET`
- URL: `{{baseUrl}}/tasks/{{taskId}}/logs`
- Headers:
  - `Authorization: Bearer {{ownerAccessToken}}`
- Body: none

Expected status: `200`

Expected payload:

- `data.items`
- newest entry reflects the latest edit or status change
- entries include `summary`, `actor`, `oldValue`, and `newValue`

### 20. Tasks Require Auth

- Method: `GET`
- URL: `{{baseUrl}}/tasks/{{taskId}}`
- Headers: none
- Body: none

Expected status: `401`

### 21. Forbidden Task Detail As Outsider

- Method: `GET`
- URL: `{{baseUrl}}/tasks/{{taskId}}`
- Headers:
  - `Authorization: Bearer {{outsiderAccessToken}}`
- Body: none

Expected status: `403`

### 22. Missing Task Detail

- Method: `GET`
- URL: `{{baseUrl}}/tasks/{{missingTaskId}}`
- Headers:
  - `Authorization: Bearer {{ownerAccessToken}}`
- Body: none

Expected status: `404`

### 23. Delete Task

- Method: `DELETE`
- URL: `{{baseUrl}}/tasks/{{taskId}}`
- Headers:
  - `Authorization: Bearer {{ownerAccessToken}}`
- Body: none

Expected status: `200`

### 24. Deleted Task Returns 404

- Method: `GET`
- URL: `{{baseUrl}}/tasks/{{taskId}}`
- Headers:
  - `Authorization: Bearer {{ownerAccessToken}}`
- Body: none

Expected status: `404`

## Cleanup

### 25. Delete Project As Owner

- Method: `DELETE`
- URL: `{{baseUrl}}/projects/{{projectId}}`
- Headers:
  - `Authorization: Bearer {{ownerAccessToken}}`
- Body: none

Expected status: `200`

### 26. Deleted Project Returns 404

- Method: `GET`
- URL: `{{baseUrl}}/projects/{{projectId}}`
- Headers:
  - `Authorization: Bearer {{ownerAccessToken}}`
- Body: none

Expected status: `404`

### 27. Logout Owner

- Method: `POST`
- URL: `{{baseUrl}}/auth/logout`
- Headers:
  - `Authorization: Bearer {{ownerAccessToken}}`
- Body: none

Expected status: `201`

## Notes

- For `GET` and `DELETE`, do not send a request body.
- For `POST` and `PUT`, use `Body -> raw -> JSON` in Postman.
- Keep the Postman cookie jar enabled if you want to test refresh and logout.
- Run the requests in order because later steps depend on the access token,
  project ID, and task ID created earlier.
