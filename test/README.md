# Backend Tests

This directory owns backend integration and e2e tests.

Current scope:

- application bootstrap verification
- health module wiring verification
- auth, authorization, project CRUD, task CRUD, task logs, and seed/demo e2e coverage
- Postman collection assets for manual API verification live in `test/postman/`
- reviewer walkthrough and final smoke flow live in `docs/REVIEWER-PACK.md`

## Postman Coverage

Import these files into Postman to test the recently implemented backend flows:

- `test/postman/archon-auth-projects.postman_collection.json`
- `test/postman/archon-local.postman_environment.json`
- `test/postman/MANUAL-POSTMAN-REST-TESTS.md` for request-by-request manual setup

The collection covers:

- signup, login, refresh, me, and logout
- project create, list, detail, update, and delete
- task create, get, update, and delete
- unauthenticated `401`, access-control `403`, and missing-resource `404` cases

The manual Postman guide also covers:

- grouped `GET /projects/:projectId/tasks` board loading verification
- `POST /seed/init` demo bootstrap and seeded reviewer login flow

Run notes:

- start the backend locally on `http://localhost:4000`
- keep the Postman cookie jar enabled so refresh and logout can use the HTTP-only refresh cookie
- run the collection in order because later requests depend on the stored access token, project ID, and task ID
