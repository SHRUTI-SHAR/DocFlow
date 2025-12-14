# Database Schema

This directory contains the database schema for the bulk processing system.

## Setup Instructions

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor

2. **Run the Schema Script**
   - Copy the contents of `schema.sql`
   - Paste into SQL Editor
   - Execute the script

3. **Verify Tables**
   - Check that all tables are created:
     - `bulk_jobs`
     - `bulk_job_documents`
     - `bulk_processing_logs`
     - `bulk_manual_review_queue`
   - Check that materialized view exists:
     - `bulk_statistics`

4. **Verify Indexes**
   - All indexes should be created automatically
   - Check index creation in Supabase dashboard

5. **Test RLS Policies**
   - Row Level Security (RLS) is enabled
   - Policies ensure users can only access their own data

## Schema Updates

When making schema changes:
1. Update `schema.sql`
2. Create migration script if needed
3. Test in development environment
4. Apply to production

## Statistics View Refresh

The `bulk_statistics` materialized view should be refreshed periodically:

```sql
SELECT refresh_bulk_statistics();
```

You can set up a cron job or scheduled task to refresh this view daily.

