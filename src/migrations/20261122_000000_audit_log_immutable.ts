import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Журнал аудиту — лише INSERT/SELECT. Тригери блокують UPDATE, DELETE і TRUNCATE
// на рівні БД, тож запис не може змінити навіть адміністратор застосунку.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION audit_log_block_mutation() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'audit_log is append-only: % is not allowed', TG_OP
        USING ERRCODE = 'insufficient_privilege';
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER audit_log_no_update_delete
      BEFORE UPDATE OR DELETE ON "audit_log"
      FOR EACH ROW EXECUTE FUNCTION audit_log_block_mutation();

    CREATE TRIGGER audit_log_no_truncate
      BEFORE TRUNCATE ON "audit_log"
      FOR EACH STATEMENT EXECUTE FUNCTION audit_log_block_mutation();
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TRIGGER IF EXISTS audit_log_no_truncate ON "audit_log";
    DROP TRIGGER IF EXISTS audit_log_no_update_delete ON "audit_log";
    DROP FUNCTION IF EXISTS audit_log_block_mutation();
  `)
}
