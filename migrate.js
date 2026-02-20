const Database = require('better-sqlite3');
const db = new Database('./dev.db');

const holderCols = db.pragma('table_info(Holder)').map(c => c.name);
console.log('Current Holder cols:', holderCols.join(', '));

const toAdd = [
    ['chain', 'TEXT NOT NULL DEFAULT "solana"'],
    ['isWhale', 'INTEGER NOT NULL DEFAULT 0'],
    ['riskScore', 'TEXT'],
    ['aiNotes', 'TEXT'],
];

for (const [col, def] of toAdd) {
    if (!holderCols.includes(col)) {
        try {
            db.exec(`ALTER TABLE Holder ADD COLUMN ${col} ${def}`);
            console.log('Added:', col);
        } catch (e) { console.log('Skip', col, e.message); }
    } else {
        console.log('Already exists:', col);
    }
}

const projCols = db.pragma('table_info(Project)').map(c => c.name);
if (!projCols.includes('contractAddress')) {
    db.exec('ALTER TABLE Project ADD COLUMN contractAddress TEXT');
    console.log('Added: Project.contractAddress');
} else {
    console.log('Project.contractAddress already exists');
}

const aiCols = db.pragma('table_info(AiAnalysis)').map(c => c.name);
console.log('AiAnalysis cols:', aiCols.join(', '));

const finalCols = db.pragma('table_info(Holder)').map(c => c.name);
console.log('Final Holder cols:', finalCols.join(', '));

db.close();
console.log('Migration complete!');
