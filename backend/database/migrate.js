/**
 * Database Migration Runner
 * Handles schema migrations with version tracking
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class MigrationRunner {
  constructor(dbPath) {
    this.db = new Database(dbPath);
    this.migrationsDir = path.join(__dirname, 'migrations');
    this.initMigrationsTable();
  }

  /**
   * Create migrations tracking table
   */
  initMigrationsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        applied_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }

  /**
   * Get list of applied migrations
   */
  getAppliedMigrations() {
    return this.db.prepare('SELECT version FROM schema_migrations ORDER BY version').all()
      .map(row => row.version);
  }

  /**
   * Get list of pending migrations
   */
  getPendingMigrations() {
    const applied = new Set(this.getAppliedMigrations());
    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.js'))
      .sort();
    
    return files.filter(f => {
      const version = f.split('_')[0];
      return !applied.has(version);
    });
  }

  /**
   * Run a single migration
   */
  runMigration(filename) {
    const version = filename.split('_')[0];
    const name = filename.replace('.js', '').substring(version.length + 1);
    const migrationPath = path.join(this.migrationsDir, filename);
    
    console.log(`  Running migration ${version}: ${name}`);
    
    try {
      const migration = require(migrationPath);
      
      // Run migration in a transaction
      this.db.exec('BEGIN TRANSACTION');
      
      migration.up(this.db);
      
      // Record migration
      this.db.prepare(`
        INSERT INTO schema_migrations (version, name) VALUES (?, ?)
      `).run(version, name);
      
      this.db.exec('COMMIT');
      console.log(`  ✓ Migration ${version} applied successfully`);
      return true;
    } catch (error) {
      this.db.exec('ROLLBACK');
      console.error(`  ✗ Migration ${version} failed:`, error.message);
      return false;
    }
  }

  /**
   * Run all pending migrations
   */
  migrate() {
    console.log('\n🔄 Running database migrations...\n');
    
    const pending = this.getPendingMigrations();
    
    if (pending.length === 0) {
      console.log('  No pending migrations.\n');
      return true;
    }
    
    console.log(`  Found ${pending.length} pending migration(s)\n`);
    
    for (const migration of pending) {
      const success = this.runMigration(migration);
      if (!success) {
        console.error('\n❌ Migration failed. Stopping.\n');
        return false;
      }
    }
    
    console.log('\n✅ All migrations applied successfully.\n');
    return true;
  }

  /**
   * Rollback the last migration
   */
  rollback() {
    const applied = this.getAppliedMigrations();
    
    if (applied.length === 0) {
      console.log('No migrations to rollback.');
      return false;
    }
    
    const lastVersion = applied[applied.length - 1];
    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.startsWith(lastVersion));
    
    if (files.length === 0) {
      console.error(`Migration file for version ${lastVersion} not found.`);
      return false;
    }
    
    const filename = files[0];
    const migrationPath = path.join(this.migrationsDir, filename);
    const migration = require(migrationPath);
    
    if (!migration.down) {
      console.error(`Migration ${lastVersion} does not support rollback.`);
      return false;
    }
    
    console.log(`Rolling back migration ${lastVersion}...`);
    
    try {
      this.db.exec('BEGIN TRANSACTION');
      
      migration.down(this.db);
      
      this.db.prepare('DELETE FROM schema_migrations WHERE version = ?').run(lastVersion);
      
      this.db.exec('COMMIT');
      console.log(`✓ Migration ${lastVersion} rolled back successfully`);
      return true;
    } catch (error) {
      this.db.exec('ROLLBACK');
      console.error(`✗ Rollback failed:`, error.message);
      return false;
    }
  }

  /**
   * Show migration status
   */
  status() {
    console.log('\n📋 Migration Status\n');
    
    const applied = this.getAppliedMigrations();
    const pending = this.getPendingMigrations();
    
    console.log('Applied migrations:');
    if (applied.length === 0) {
      console.log('  (none)');
    } else {
      const details = this.db.prepare(`
        SELECT version, name, applied_at FROM schema_migrations ORDER BY version
      `).all();
      details.forEach(m => {
        console.log(`  ✓ ${m.version} - ${m.name} (${m.applied_at})`);
      });
    }
    
    console.log('\nPending migrations:');
    if (pending.length === 0) {
      console.log('  (none)');
    } else {
      pending.forEach(f => {
        const version = f.split('_')[0];
        const name = f.replace('.js', '').substring(version.length + 1);
        console.log(`  ○ ${version} - ${name}`);
      });
    }
    
    console.log('');
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}

// CLI execution
if (require.main === module) {
  const dbPath = process.argv[2] || path.join(__dirname, '..', 'valet.db');
  const command = process.argv[3] || 'migrate';
  
  const runner = new MigrationRunner(dbPath);
  
  switch (command) {
    case 'migrate':
      runner.migrate();
      break;
    case 'rollback':
      runner.rollback();
      break;
    case 'status':
      runner.status();
      break;
    default:
      console.log('Usage: node migrate.js [dbPath] [migrate|rollback|status]');
  }
  
  runner.close();
}

module.exports = MigrationRunner;
