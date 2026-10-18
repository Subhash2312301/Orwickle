\echo '=== _migrations table ==='
SELECT id, name, applied_at FROM _migrations;

\echo '=== Row Security on public tables ==='
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
