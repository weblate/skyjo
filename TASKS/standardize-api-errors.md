# Feature: Standardize API Errors

This task involves refactoring the API error handling to use a standardized format. All errors from the `apps/api/src/http` part of the API should be referenced in `packages/shared/constants` to be used by the frontend for translations.

## Task List

- [ ] Create `TASKS/standardize-api-errors.md`
- [ ] Survey `apps/api/src/http` for all error responses.
- [ ] Consolidate and create new error constants in `packages/shared/constants`.
- [ ] Refactor `apps/api/src/http/auth/auth.router.ts` to use new error constants.
- [ ] Refactor `apps/api/src/http/auth/google.router.ts` to use new error constants.
- [ ] Refactor `apps/api/src/http/user/user.router.ts` to use new error constants.
- [ ] Refactor `apps/api/src/http/middlewares/auth.middleware.ts` to use new error constants.
- [ ] Refactor `apps/api/src/http/middlewares/rateLimiter.ts` to use new error constants.
- [ ] Refactor `apps/api/src/http/feedback/feedback.router.ts` and service to use new error constants.
- [ ] Refactor `apps/api/src/http/userVerification/userVerification.router.ts` and service to use new error constants.
- [ ] Update frontend translation files in `apps/web/locales` with new error keys.
- [ ] Verify all API responses follow the `{ success: boolean, ... }` structure.

## Implementation Plan

The goal is to have a consistent error handling mechanism across the API.

1.  **Standardize Response Format:**
    - Success responses: `{ success: true, ...data }`
    - Error responses: `{ success: false, error: "ERROR_CODE" }`

2.  **Error Constants:**
    - All error codes will be stored in `packages/shared/constants/`. This allows both the API and the web app to reference the same constants.
    - New error constants will be added as needed.

3.  **API Refactoring:**
    - Each HTTP router in `apps/api/src/http` will be updated to catch errors and return the standardized error response.
    - Hardcoded error strings will be replaced with the new error constants.

4.  **Frontend Translations:**
    - The error codes will be used as keys in the frontend's localization files (e.g., `apps/web/locales/en.json`).
    - This will allow for easy translation of error messages displayed to the user.

## Relevant Files

- `TASKS/standardize-api-errors.md`
- `packages/shared/constants/auth.ts`
- `packages/shared/constants/user-error.ts`
- `apps/api/src/http/auth/auth.router.ts`
- `apps/api/src/http/auth/auth.service.ts`
- `apps/api/src/http/auth/google.router.ts`
- `apps/api/src/http/user/user.router.ts`
- `apps/api/src/http/user/user.service.ts`
- `apps/api/src/http/middlewares/auth.middleware.ts`
- `apps/api/src/http/middlewares/rateLimiter.ts`
- `apps/api/src/http/userVerification/userVerification.router.ts`
- `apps/api/src/http/userVerification/userVerification.service.ts`
- `apps/web/locales/en.json`
- `apps/web/locales/fr.json`

## Relevant Cursor Rules

- [API MDC](mdc:.cursor/rules/apps/api.mdc)
- [TypeScript Best Practices](mdc:.cursor/rules/lib/typescript.mdc) 