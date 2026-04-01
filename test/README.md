# Backend Tests

This directory owns backend integration and e2e tests.

Current scope:

- application bootstrap verification
- health module wiring verification
- auth, authorization, and project CRUD e2e coverage
- Postman collection assets for manual API verification live in `test/postman/`

## Postman Coverage

Import these files into Postman to test the recently implemented backend flows:

- `test/postman/archon-auth-projects.postman_collection.json`
- `test/postman/archon-local.postman_environment.json`

The collection covers:

- signup, login, refresh, me, and logout
- project create, list, detail, update, and delete
- unauthenticated `401`, owner-only `403`, and missing-project `404` cases

Run notes:

- start the backend locally on `http://localhost:4000`
- keep the Postman cookie jar enabled so refresh and logout can use the HTTP-only refresh cookie
- run the collection in order because later requests depend on the stored access token and project ID
