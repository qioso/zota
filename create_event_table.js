
const Database = require('better-sqlite3');
const db = new Database('./dev.db');

try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    console.log('Current tables:', tables.join(', '));

    if (!tables.includes('Event')) {
        console.log('Creating Event table...');
        db.exec(`
            CREATE TABLE "Event" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "projectId" TEXT,
                "type" TEXT NOT NULL,
                "severity" TEXT NOT NULL DEFAULT 'info',
                "message" TEXT NOT NULL,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
            )
        `);
        console.log('Event table created.');
    } else {
        console.log('Event table already exists.');
    }

    if (!tables.includes('Token')) {
        console.log('Creating Token table...');
        db.exec(`
            CREATE TABLE "Token" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "projectId" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "symbol" TEXT NOT NULL,
                "chain" TEXT NOT NULL DEFAULT 'solana',
                "contractAddress" TEXT NOT NULL,
                "decimals" INTEGER NOT NULL DEFAULT 9,
                "supply" REAL,
                "price" REAL,
                "marketCap" REAL,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL,
                FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            );
            CREATE UNIQUE INDEX "Token_contractAddress_key" ON "Token"("contractAddress");
        `);
        console.log('Token table created.');
    } else {
        console.log('Token table already exists.');
    }

    const projectCols = db.pragma('table_info(Project)').map(c => c.name);
    if (!projectCols.includes('chain')) {
        console.log('Adding chain column to Project...');
        db.exec('ALTER TABLE "Project" ADD COLUMN "chain" TEXT NOT NULL DEFAULT "solana"');
        console.log('Project.chain added.');
    } else {
        console.log('Project.chain exists.');
    }



} catch (e) {
    console.error('Error:', e);
} finally {
    db.close();
}
