import sqlite3
import psycopg2
import argparse
import os
import sentry_sdk
from psycopg2.extras import execute_values

# Initialize Sentry (if DSN provided)
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(dsn=SENTRY_DSN)

def migrate(sqlite_path, postgres_url, dry_run=False):
    print(f"Starting migration from {sqlite_path} to PostgreSQL...")
    if dry_run:
        print("DRY RUN ENABLED - No changes will be committed.")

    try:
        sqlite_conn = sqlite3.connect(sqlite_path)
        sqlite_cur = sqlite_conn.cursor()

        pg_conn = psycopg2.connect(postgres_url)
        pg_cur = pg_conn.cursor()

        # Get all tables from SQLite
        sqlite_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [t[0] for t in sqlite_cur.fetchall()]

        print(f"Found {len(tables)} tables: {', '.join(tables)}")

        total_rows_inserted = 0

        for table in tables:
            print(f"Migrating table: {table}...")
            
            # Fetch all rows from SQLite
            sqlite_cur.execute(f"SELECT * FROM {table}")
            rows = sqlite_cur.fetchall()
            
            if not rows:
                print(f"  Table {table} is empty. Skipping.")
                continue

            # Get column names
            sqlite_cur.execute(f"PRAGMA table_info({table})")
            columns = [col[1] for col in sqlite_cur.fetchall()]
            col_names = ", ".join(columns)
            placeholders = ", ".join(["%s"] * len(columns))

            # Insert into PostgreSQL
            insert_query = f"INSERT INTO {table} ({col_names}) VALUES ({placeholders})"
            
            try:
                # Use execute_values for better performance if needed, 
                # but simple execute is fine for small/medium datasets.
                for row in rows:
                    pg_cur.execute(insert_query, row)
                
                print(f"  Successfully inserted {len(rows)} rows into {table}.")
                total_rows_inserted += len(rows)
            except Exception as e:
                print(f"  ERROR migrating table {table}: {e}")
                sentry_sdk.capture_exception(e)
                pg_conn.rollback()
                raise e

        if dry_run:
            print("Rolling back transaction (Dry Run)...")
            pg_conn.rollback()
        else:
            print("Committing transaction...")
            pg_conn.commit()

        print("\nMIGRATION SUMMARY:")
        print(f"Total tables migrated: {len(tables)}")
        print(f"Total rows inserted: {total_rows_inserted}")
        
        sentry_sdk.capture_message(f"Migration completed: {total_rows_inserted} rows inserted across {len(tables)} tables.")

    except Exception as e:
        print(f"FATAL ERROR during migration: {e}")
        sentry_sdk.capture_exception(e)
    finally:
        if 'sqlite_conn' in locals(): sqlite_conn.close()
        if 'pg_conn' in locals(): pg_conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate data from SQLite to PostgreSQL")
    parser.add_argument("--sqlite-path", help="Path to the SQLite .db file", default="./backend/anime_tracker.db")
    parser.add_argument("--postgres-url", help="Target PostgreSQL DSN")
    parser.add_argument("--dry-run", action="store_true", help="Execute but rollback at the end")
    
    args = parser.parse_args()
    
    sqlite_path = args.sqlite_path
    postgres_url = args.postgres_url or os.getenv("DATABASE_URL")
    
    if not postgres_url:
        print("Error: PostgreSQL URL must be provided via --postgres-url or DATABASE_URL environment variable.")
        exit(1)
        
    migrate(sqlite_path, postgres_url, args.dry_run)
