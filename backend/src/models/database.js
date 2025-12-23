// Database Connection Module
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../database/valet.db');
const SCHEMA_PATH = path.join(__dirname, '../../database/schema.sql');

let db;

function initDatabase() {
    return new Promise((resolve, reject) => {
        // Create database directory
        const dbDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                reject(err);
            } else {
                console.log('✓ Database connected');
                
                // Execute schema
                const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
                db.exec(schema, (err) => {
                    if (err) reject(err);
                    else {
                        console.log('✓ Schema initialized');
                        resolve(db);
                    }
                });
            }
        });
    });
}

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

async function getNextSequence() {
    const setting = await get("SELECT value FROM system_settings WHERE key = 'current_sequence'");
    const current = parseInt(setting.value) || 0;
    const next = current + 1;
    await run("UPDATE system_settings SET value = ? WHERE key = 'current_sequence'", [next.toString()]);
    return next;
}

module.exports = {
    initDatabase,
    query,
    run,
    get,
    getNextSequence
};
