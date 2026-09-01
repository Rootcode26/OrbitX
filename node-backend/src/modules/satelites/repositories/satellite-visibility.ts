// User-commissioned satellites (created via the maker) carry a
// created_by_user_id; real SATCAT objects have it NULL. Shared read surfaces
// must only expose public objects plus the caller's own private ones.
//
// The clause resolves the caller's internal user id from their Clerk id inline,
// so a single Clerk-id parameter (string, or null for anonymous callers) drives
// it: when null, the subquery matches no row and the clause collapses to
// "created_by_user_id IS NULL" — public objects only.
export const satelliteVisibilityClause = (clerkUserIdParameter: string, alias = "satellite") =>
  `(
    ${alias}.created_by_user_id IS NULL
    OR ${alias}.created_by_user_id = (
      SELECT id FROM user_details WHERE clerk_user_id = ${clerkUserIdParameter}
    )
  )`;
