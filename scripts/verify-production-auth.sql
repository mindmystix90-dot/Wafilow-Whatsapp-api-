-- ==============================================================================
-- WAFILOW — PRODUCTION DATABASE READ-ONLY AUTHENTICATION VERIFICATION SCRIPT
-- ==============================================================================
-- INSTRUCTIONS:
-- 1. Open your web browser and navigate to: https://console.neon.tech
-- 2. Select your Wafilow Project.
-- 3. In the Branch dropdown selector, select: "production"
-- 4. In the left navigation, click: "SQL Editor"
-- 5. Paste this entire script into the editor and click "Run".
--
-- SAFETY ASSURANCE:
-- 100% Read-Only. Uses SELECT and catalog introspection.
-- Zero DDL/DML, zero writes, zero data alterations.
-- Never exposes raw password hashes (only reports presence and bcrypt format).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- CHECK 1: Neon Active Branch & Connection Identity
-- ------------------------------------------------------------------------------
SELECT 
    current_setting('neon.branch_name', true) AS active_branch,
    current_database() AS database_name,
    current_user AS connected_user,
    CASE 
        WHEN current_setting('neon.branch_name', true) = 'production' 
        THEN 'CONFIRMED: Connected to Neon production branch'
        WHEN current_setting('neon.branch_name', true) IS NULL OR current_setting('neon.branch_name', true) = ''
        THEN 'NOTICE: neon.branch_name setting is empty (standard for direct connection poolers). Confirm branch in Neon Console header.'
        ELSE 'SAFETY HALT: Connected to branch ' || current_setting('neon.branch_name', true) || ' instead of production!'
    END AS branch_status;

-- ------------------------------------------------------------------------------
-- CHECK 2: Authentication Table & Column Presence Audit
-- Checks whether User and Organization tables exist and whether incremental
-- columns (status, sessionVersion) have been added.
-- ------------------------------------------------------------------------------
SELECT 
    'User Table' AS object_name,
    CASE WHEN to_regclass('public."User"') IS NOT NULL THEN 'PRESENT' ELSE 'MISSING' END AS status
UNION ALL
SELECT 
    'User.status Column',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'status'
    ) THEN 'PRESENT (Migrated)' ELSE 'ABSENT (Baseline 0_init)' END
UNION ALL
SELECT 
    'User.sessionVersion Column',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'sessionVersion'
    ) THEN 'PRESENT (Migrated)' ELSE 'ABSENT (Baseline 0_init)' END
UNION ALL
SELECT 
    'Organization Table',
    CASE WHEN to_regclass('public."Organization"') IS NOT NULL THEN 'PRESENT' ELSE 'MISSING' END
UNION ALL
SELECT 
    'Organization.status Column',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Organization' AND column_name = 'status'
    ) THEN 'PRESENT (Migrated)' ELSE 'ABSENT (Baseline 0_init)' END;

-- ------------------------------------------------------------------------------
-- CHECK 3: Total User & Organization Counts
-- ------------------------------------------------------------------------------
SELECT 
    (SELECT count(*) FROM "User") AS total_registered_users,
    (SELECT count(*) FROM "Organization") AS total_organizations;

-- ------------------------------------------------------------------------------
-- CHECK 4: Target User Accounts Verification
-- Audits mindmystrix90@gmail.com, mindmystix90@gmail.com, and theballoon101@gmail.com
-- ------------------------------------------------------------------------------
SELECT 
    u.id AS user_id,
    u.email AS email_address,
    u.name AS user_name,
    u.role AS user_role,
    u."organizationId" AS organization_id,
    o.name AS organization_name,
    -- Password hash checks (strictly boolean, no raw hashes printed)
    CASE 
        WHEN u.password IS NULL THEN 'NO: Password is NULL'
        WHEN length(u.password) < 20 THEN 'INVALID: Password hash too short'
        WHEN u.password LIKE '$2a$%' OR u.password LIKE '$2b$%' OR u.password LIKE '$2y$%' THEN 'YES: Valid Bcrypt hash present'
        ELSE 'UNKNOWN: Password stored in non-bcrypt format'
    END AS password_status,
    -- Check if user is associated with a valid organization
    CASE 
        WHEN o.id IS NOT NULL THEN 'VALID: Organization exists'
        WHEN u."organizationId" IS NULL THEN 'NOTICE: User has no organizationId'
        ELSE 'BROKEN: organizationId does not match any Organization record'
    END AS organization_relationship_status,
    u."createdAt" AS account_created_at
FROM "User" u
LEFT JOIN "Organization" o ON u."organizationId" = o.id
WHERE lower(u.email) IN (
    'mindmystrix90@gmail.com',
    'mindmystix90@gmail.com',
    'theballoon101@gmail.com'
);

-- ------------------------------------------------------------------------------
-- CHECK 5: All Registered User Emails in Database (For Account Discovery)
-- Lists all user emails and roles (without passwords) so you can verify the exact
-- registered address if there was a typo during signup.
-- ------------------------------------------------------------------------------
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u."organizationId",
    CASE WHEN u.password IS NOT NULL AND length(u.password) >= 20 THEN true ELSE false END AS has_password,
    u."createdAt"
FROM "User" u
ORDER BY u."createdAt" DESC
LIMIT 20;
