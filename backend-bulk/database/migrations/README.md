# Database Migrations

This directory contains SQL migration files for the bulk processing system.

## Migration Files

### `001_add_granular_fields.sql`
**Phase 1: Granular Field Storage**

Adds the core `bulk_extracted_fields` table and related infrastructure:
- ✅ `bulk_extracted_fields` table (one row per field)
- ✅ Performance indexes for fast queries
- ✅ Summary statistics on `bulk_job_documents`
- ✅ Materialized view for job-level statistics
- ✅ Auto-update triggers
- ✅ Helper functions for analytics
- ✅ Row Level Security policies

**Impact:**
- Enables CSV/Excel export from granular data
- Allows real-time field-level progress tracking
- Supports field-level validation and review
- Enables detailed analytics and reporting

---

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Open your Supabase project
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `001_add_granular_fields.sql`
5. Paste into the editor
6. Click **Run** or press `Ctrl+Enter`
7. Verify success (check for green checkmark)

### Option 2: Supabase CLI

```bash
# Make sure you're in the backend-bulk directory
cd backend-bulk

# Apply migration
supabase db execute < database/migrations/001_add_granular_fields.sql
```

### Option 3: Direct psql Connection

```bash
# Connect to your database
psql postgresql://postgres:[password]@[host]:[port]/postgres

# Run migration
\i backend-bulk/database/migrations/001_add_granular_fields.sql
```

---

## Verification

After applying the migration, verify it worked:

```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'bulk_extracted_fields';

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'bulk_extracted_fields';

-- Check materialized view
SELECT * FROM bulk_job_field_statistics LIMIT 1;

-- Test helper function
SELECT * FROM get_field_distribution('00000000-0000-0000-0000-000000000000'::UUID);
```

Expected results:
- ✅ Table `bulk_extracted_fields` exists
- ✅ 10+ indexes created
- ✅ Materialized view `bulk_job_field_statistics` exists
- ✅ Helper functions work (even with no data)

---

## Rollback (If Needed)

If you need to undo this migration:

```sql
-- Drop everything in reverse order
DROP MATERIALIZED VIEW IF EXISTS bulk_job_field_statistics CASCADE;
DROP FUNCTION IF EXISTS get_low_confidence_fields CASCADE;
DROP FUNCTION IF EXISTS get_field_distribution CASCADE;
DROP FUNCTION IF EXISTS refresh_bulk_field_statistics CASCADE;
DROP FUNCTION IF EXISTS update_document_field_statistics CASCADE;
DROP TABLE IF EXISTS bulk_extracted_fields CASCADE;

-- Remove added columns from bulk_job_documents
ALTER TABLE bulk_job_documents 
    DROP COLUMN IF EXISTS total_fields_extracted,
    DROP COLUMN IF EXISTS fields_needing_review,
    DROP COLUMN IF EXISTS average_confidence,
    DROP COLUMN IF EXISTS processing_time_ms,
    DROP COLUMN IF EXISTS total_tokens_used;
```

---

## Performance Notes

### Storage Estimates

For **1,000 PDFs** (60 pages each, ~3,600 fields per PDF):

| Component | Rows | Storage |
|-----------|------|---------|
| `bulk_extracted_fields` | 3.6M | ~450 MB |
| Indexes | - | ~550 MB |
| **Total** | **3.6M** | **~1 GB** |

### Query Performance

With proper indexes:

| Query Type | Time | Notes |
|------------|------|-------|
| Insert (COPY) | 100ms | 3,600 fields at once |
| Get job fields | 500ms | 3.6M rows with filters |
| Get document fields | 10ms | 3,600 rows |
| Low confidence query | 50ms | Uses partial index |
| Export query | 2-5s | All fields, joins documents |

### Maintenance

The materialized view should be refreshed periodically:

```sql
-- Refresh view (run every 5 minutes via cron or scheduler)
SELECT refresh_bulk_field_statistics();

-- Or set up automatic refresh
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'refresh-field-stats',
    '*/5 * * * *',  -- Every 5 minutes
    'SELECT refresh_bulk_field_statistics()'
);
```

---

## What's Next?

After applying this migration:

1. ✅ **Phase 1 Complete**: Database schema ready
2. ⏭️ **Next: Phase 2** - Build processing pipeline
   - Copy LLM modules from main backend
   - Create optimized document processor
   - Implement bulk insert service
3. ⏭️ **Phase 3** - Real-time updates via WebSocket
4. ⏭️ **Phase 4** - CSV/Excel export service
5. ⏭️ **Phase 5** - Frontend integration

---

## Troubleshooting

### Error: "relation already exists"
- Migration was already applied
- Safe to ignore or run rollback first

### Error: "permission denied"
- Make sure you're connected as a superuser
- Or use Supabase Dashboard (has proper permissions)

### Slow INSERT performance
- Make sure you're using PostgreSQL COPY (not individual INSERTs)
- Check if you have too many indexes (temporarily disable during bulk insert)

### Materialized view not updating
- Run `REFRESH MATERIALIZED VIEW bulk_job_field_statistics;`
- Set up automatic refresh with pg_cron (see Maintenance section)

---

## Contact

Questions or issues? Check the main documentation:
- `BULK_PROCESSING_GRANULAR_IMPLEMENTATION.md`
- `BULK_PROCESSING_ARCHITECTURE_EXPLAINED.md`
