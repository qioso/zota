import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const p = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
    const count = await p.project.count();
    console.log('Projects:', count);
    const events = await p.event.findMany({ take: 2 });
    console.log('Events:', events.length);
}

main().then(() => p.$disconnect()).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
