-- ==============================================================================
-- WAFILOW — BROWSER-BASED READ-ONLY STAGING DIAGNOSTIC SCRIPT (FAIL-SAFE)
-- ==============================================================================
-- INSTRUCTIONS:
-- 1. Open your web browser and navigate to: https://console.neon.tech
-- 2. Select your Wafilow Project.
-- 3. In the Branch dropdown selector (top header), select: "wafilow-staging"
-- 4. In the left navigation, click: "SQL Editor"
-- 5. Paste this entire script into the editor and click "Run".
--
-- SAFETY ASSURANCE:
-- 100% Read-Only. Uses information_schema and to_regclass catalog introspection.
-- Will NEVER fail or error if tables or columns are missing.
-- Zero DDL/DML, zero writes, zero credentials.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- CHECK 1: Neon Active Branch & Connection Identity
-- ------------------------------------------------------------------------------
SELECT 
    current_setting('neon.branch_name', true) AS active_branch,
    current_database() AS current_database,
    current_user AS connected_user,
    CASE 
        WHEN current_setting('neon.branch_name', true) = 'wafilow-staging' 
        THEN 'PASSED: Verified connection to wafilow-staging'
        ELSE 'SAFETY HALT: You are NOT on wafilow-staging. Switch branch in Neon Console.'
    END AS branch_verification_status;

-- ------------------------------------------------------------------------------
-- CHECK 2: Prisma Migration Table Presence
-- Checks whether _prisma_migrations exists in the database.
-- ------------------------------------------------------------------------------
SELECT 
    CASE 
        WHEN to_regclass('public."_prisma_migrations"') IS NOT NULL 
        THEN 'INITIALIZED: _prisma_migrations table exists'
        ELSE 'UNINITIALIZED: _prisma_migrations does not exist (Prisma Migrate has never been run)'
    END AS prisma_migration_tracking_status;

-- ------------------------------------------------------------------------------
-- CHECK 3: Comprehensive Model-to-Table Presence Audit
-- Verifies the existence of all 15 Prisma models + _prisma_migrations without erroring.
-- ------------------------------------------------------------------------------
SELECT 
    expected.table_name,
    expected.expected_origin,
    CASE 
        WHEN to_regclass(format('public."%s"', expected.table_name)) IS NOT NULL 
        THEN 'PRESENT'
        ELSE 'MISSING FROM DATABASE'
    END AS database_status
FROM (
    VALUES 
        ('Account', 'Base Schema (pre-migration-backup)'),
        ('Campaign', 'Base Schema (pre-migration-backup)'),
        ('Contact', 'Base Schema (pre-migration-backup)'),
        ('Conversation', 'Base Schema (pre-migration-backup)'),
        ('Message', 'Base Schema (pre-migration-backup)'),
        ('Organization', 'Base Schema (pre-migration-backup)'),
        ('Session', 'Base Schema (pre-migration-backup)'),
        ('Template', 'Base Schema (pre-migration-backup)'),
        ('User', 'Base Schema (pre-migration-backup)'),
        ('VerificationToken', 'Base Schema (pre-migration-backup)'),
        ('WhatsAppBusinessAccount', 'Base Schema (pre-migration-backup)'),
        ('WhatsAppPhoneNumber', 'Base Schema (pre-migration-backup)'),
        ('WhatsAppConnection', 'Migration: 20261016000000_add_whatsapp_connection'),
        ('AuditLog', 'Migration: 20261020000000_add_super_admin_persistence'),
        ('PasswordResetToken', 'Migration: 20261020000000_add_super_admin_persistence'),
        ('_prisma_migrations', 'Prisma Migrate Engine Metadata')
) AS expected(table_name, expected_origin)
ORDER BY expected.table_name;

-- ------------------------------------------------------------------------------
-- CHECK 4: Incremental Migration Column Presence Audit
-- Introspects whether columns introduced by the two migration files exist on the 12 base tables.
-- ------------------------------------------------------------------------------
SELECT 
    chk.target_table,
    chk.target_column,
    chk.expected_type,
    chk.introduced_in_migration,
    CASE 
        WHEN cols.column_name IS NOT NULL THEN 'PRESENT'
        ELSE 'MISSING FROM TABLE'
    END AS column_status,
    cols.data_type AS actual_data_type,
    cols.is_nullable AS is_nullable,
    cols.column_default AS default_value
FROM (
    VALUES 
        ('Contact', 'environment', 'text', '20261016000000_add_whatsapp_connection'),
        ('Conversation', 'environment', 'text', '20261016000000_add_whatsapp_connection'),
        ('Message', 'environment', 'text', '20261016000000_add_whatsapp_connection'),
        ('User', 'status', 'text', '20261020000000_add_super_admin_persistence'),
        ('User', 'sessionVersion', 'integer', '20261020000000_add_super_admin_persistence'),
        ('Organization', 'status', 'text', '20261020000000_add_super_admin_persistence'),
        ('Organization', 'planTier', 'text', '20261020000000_add_super_admin_persistence'),
        ('Organization', 'monthlyLimit', 'integer', '20261020000000_add_super_admin_persistence')
) AS chk(target_table, target_column, expected_type, introduced_in_migration)
LEFT JOIN information_schema.columns cols
    ON cols.table_schema = 'public' 
   AND cols.table_name = chk.target_table 
   AND cols.column_name = chk.target_column
ORDER BY chk.target_table, chk.target_column;

-- ------------------------------------------------------------------------------
-- CHECK 5: Estimated Live Rows in Existing Base Tables
-- Inspects pg_stat_user_tables to verify that existing tables have zero rows (schema-only).
-- ------------------------------------------------------------------------------
SELECT 
    relname AS table_name,
    n_live_tup AS estimated_live_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;
