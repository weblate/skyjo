# Delayed Account Deletion Feature

This feature introduces a 48-hour delay for account deletion to prevent accidental deletions and give users a chance to cancel the process. When a user requests to delete their account, a delayed job is queued. The user receives an email with a cancellation link. If not cancelled within 48 hours, the account is permanently deleted.

## In Progress Tasks

### Database

- [x] Create a new table `accountDeletionRequests` with `id`, `userId`, `jobId`, `token`, and `expiresAt` columns.

### Backend (API)

- [x] Create a new route `POST /user/delete-account/cancel` to handle cancellation.
- [x] Update `DELETE /user` endpoint:
  - [x] Instead of deleting, generate a token for cancellation token is stored as a hash using `hashToken`.
  - [x] Add a job to the `account-deletion` queue with a 48-hour delay.
  - [x] Store the `jobId`, `userId`, and `token` in the `accountDeletionRequests` table.
  - [x] Send the "account scheduled for deletion" email.
- [x] Implement the cancellation logic in `POST /user/delete-account/cancel`:
  - [x] Validate the token.
  - [x] Find the corresponding job in the `accountDeletionRequests` table.
  - [x] Remove the job from the BullMQ queue using the `jobId`.
  - [x] Delete the entry from `accountDeletionRequests`.

### Workers

- [x] Create a new worker for the `account-deletion` queue.
- [x] The worker should process the job by:
  - [x] Performing the actual account deletion logic (renaming user fields).
  - [x] Sending the final "account deleted" confirmation email.
  - [x] Delete the entry from `accountDeletionRequests`.

### Emails

- [x] Create a new email template: `AccountDeletionScheduled`.
- [x] The email must contain a link to cancel the deletion, e.g., `https://<domain>/cancel-account-deletion/<token>`.

### Frontend (Web)

- [x] Create a new page at `/cancel-account-deletion` to handle the cancellation link.
- [x] This page should extract the token from the URL.
- [x] It should make a server-side API call to `POST /user/delete-account/cancel`.
- [x] Display a confirmation or error message to the user based on the API response.
- [x] Update the user settings page to inform the user that their account is scheduled for deletion.

## Implementation Plan

When a user initiates account deletion, the API will create a delayed job and send an email with a cancellation link. The link leads to a page that triggers an API call to remove the job from the queue if the user chooses to cancel.

### Relevant Files

- `apps/api/src/http/user/user.router.ts` - To be modified to queue the deletion job.
- `apps/api/src/http/user/user.service.ts` - To be modified to queue the deletion job.
- `apps/workers/src/account-deletion/` - New directory for the deletion worker.
- `apps/web/app/[locale]/cancel-account-deletion/page.tsx` - New page for handling cancellation.
- `packages/database/drizzle/00XX_add_account_deletion_requests.sql` - New migration file for the database table.
- `packages/transactional/emails/account-deletion-scheduled.tsx` - New email template.


## Polish design and details

- [x] Check delete account button, modal and toast
- [x] Check the email
- [ ] Check the cancel account deletion page