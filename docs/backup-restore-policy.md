# Supabase Backup / Restore Policy

Production readiness requires confirming backup settings in the Supabase dashboard because project backup and PITR status are not exposed through normal Postgres SQL.

## Required Checks

- Database backups are enabled for the production Supabase project.
- Point-in-Time Recovery is enabled if the project tier supports it.
- Recovery objective is documented:
  - RPO: maximum acceptable data loss window.
  - RTO: maximum acceptable restore time.
- At least one manual restore drill has been completed against a non-production project.
- `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `JWT_SECRET` are stored only as deployment secrets.
- Supabase DB password and API keys are rotated after any accidental exposure.

## Restore Drill

1. Create a temporary Supabase project.
2. Restore the latest production backup into that project.
3. Run:

```bash
npm run db:drift
```

4. Start the app against the restored database.
5. Smoke test login, course listing, enrollment, quiz submit, and assignment grading.

## Current Verification Status

Application-level schema drift is checked by `npm run db:drift`.
Supabase backup/PITR status must be confirmed manually in the Supabase dashboard or through a Supabase Management API integration.
