"""
Apply smart folder columns migration
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Supabase credentials
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase credentials in .env file")
    print("Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set")
    exit(1)

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Read migration file
migration_file = "supabase/migrations/20251217000000_add_smart_folder_columns.sql"
with open(migration_file, 'r') as f:
    migration_sql = f.read()

print(f"Applying migration: {migration_file}")
print("-" * 60)

try:
    # Execute the migration SQL
    # Note: We need to use the PostgreSQL REST API or direct connection
    # For Supabase, we typically use the Supabase CLI or direct psql connection
    
    print("⚠️  Note: This script requires direct database access.")
    print("Please use one of these methods to apply the migration:")
    print()
    print("Method 1 - Supabase CLI:")
    print("  supabase db push")
    print()
    print("Method 2 - Direct PostgreSQL:")
    print("  psql -h <your-db-host> -U postgres -d postgres < supabase/migrations/20251217000000_add_smart_folder_columns.sql")
    print()
    print("Method 3 - Supabase Dashboard:")
    print("  1. Go to your Supabase Dashboard")
    print("  2. Navigate to SQL Editor")
    print("  3. Copy and paste the migration SQL")
    print("  4. Run the query")
    print()
    print("=" * 60)
    print("Migration SQL:")
    print("=" * 60)
    print(migration_sql)
    
except Exception as e:
    print(f"Error: {e}")
