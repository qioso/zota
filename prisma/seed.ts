import { PrismaClient } from './generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Seeding multi-chain database...');

    await prisma.aiAnalysis.deleteMany();
    await prisma.event.deleteMany();
    await prisma.holder.deleteMany();
    await prisma.token.deleteMany();
    await prisma.project.deleteMany();

    // SOLANA projects
    const bonk = await prisma.project.create({
        data: { name: 'Bonk', symbol: 'BONK', chain: 'solana', mintAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', network: 'mainnet', description: 'The first Solana dog coin.', website: 'https://bonkcoin.com', totalSupply: 93526183890996, status: 'active' },
    });
    const jup = await prisma.project.create({
        data: { name: 'Jupiter', symbol: 'JUP', chain: 'solana', mintAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', network: 'mainnet', description: 'Solana liquidity aggregator.', website: 'https://jup.ag', totalSupply: 10000000000, status: 'active' },
    });

    // ETHEREUM projects
    const uni = await prisma.project.create({
        data: { name: 'Uniswap', symbol: 'UNI', chain: 'ethereum', mintAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', network: 'mainnet', description: 'Decentralized exchange protocol.', website: 'https://uniswap.org', totalSupply: 1000000000, status: 'active' },
    });
    const pepe = await prisma.project.create({
        data: { name: 'Pepe', symbol: 'PEPE', chain: 'ethereum', mintAddress: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', network: 'mainnet', description: 'The memecoin of Ethereum.', website: 'https://pepe.vip', totalSupply: 420690000000000, status: 'active' },
    });

    // BNB Chain projects
    const cake = await prisma.project.create({
        data: { name: 'PancakeSwap', symbol: 'CAKE', chain: 'bnb', mintAddress: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', network: 'mainnet', description: 'BNB Chain DEX & yield farming.', website: 'https://pancakeswap.finance', totalSupply: 750000000, status: 'active' },
    });

    console.log('   ✓ 5 projects (solana, ethereum, bnb)');

    // Tokens
    await prisma.token.create({ data: { projectId: bonk.id, name: 'Bonk', symbol: 'BONK', chain: 'solana', contractAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5, supply: 93526183890996, price: 0.0000234, marketCap: 2188512 } });
    await prisma.token.create({ data: { projectId: jup.id, name: 'Jupiter', symbol: 'JUP', chain: 'solana', contractAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', decimals: 6, supply: 10000000000, price: 0.82, marketCap: 8200000000 } });
    await prisma.token.create({ data: { projectId: uni.id, name: 'Uniswap', symbol: 'UNI', chain: 'ethereum', contractAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, supply: 1000000000, price: 7.42, marketCap: 7420000000 } });
    await prisma.token.create({ data: { projectId: pepe.id, name: 'Pepe', symbol: 'PEPE', chain: 'ethereum', contractAddress: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', decimals: 18, supply: 420690000000000, price: 0.00001234, marketCap: 5191314600 } });
    await prisma.token.create({ data: { projectId: cake.id, name: 'PancakeSwap', symbol: 'CAKE', chain: 'bnb', contractAddress: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18, supply: 750000000, price: 2.34, marketCap: 1755000000 } });
    console.log('   ✓ 5 tokens');

    // Holders — mix of chains
    await prisma.holder.create({ data: { projectId: bonk.id, walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', chain: 'solana', balance: 5000000000, percentage: 5.34, isWhale: true } });
    await prisma.holder.create({ data: { projectId: bonk.id, walletAddress: 'BonkF6M3Na3GpTwBb8jY5oGGnoBJfLfSHs4Y9oU7VCL1', chain: 'solana', balance: 3200000000, percentage: 3.42 } });
    await prisma.holder.create({ data: { projectId: bonk.id, walletAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', chain: 'solana', balance: 25000000000, percentage: 26.7, isWhale: true, riskScore: 'high', aiNotes: 'Possible insider: 26.7% concentration' } });
    await prisma.holder.create({ data: { projectId: jup.id, walletAddress: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', chain: 'solana', balance: 2500000000, percentage: 25.0, isWhale: true } });
    await prisma.holder.create({ data: { projectId: uni.id, walletAddress: '0x47173B170C64d16393a52e6C480b3Ad8c302ba1e', chain: 'ethereum', balance: 15000000, percentage: 1.5 } });
    await prisma.holder.create({ data: { projectId: uni.id, walletAddress: '0x1a9C8182C09F50C8318d769245beA52c32BE35BC', chain: 'ethereum', balance: 85000000, percentage: 8.5, isWhale: true, riskScore: 'medium' } });
    await prisma.holder.create({ data: { projectId: pepe.id, walletAddress: '0xF977814e90dA44bFA03b6295A0616a897441aceC', chain: 'ethereum', balance: 50000000000000, percentage: 11.88, isWhale: true } });
    await prisma.holder.create({ data: { projectId: cake.id, walletAddress: '0x73feaa1eE314F8c655E354234017bE2193C9E24E', chain: 'bnb', balance: 120000000, percentage: 16.0, isWhale: true, riskScore: 'high', aiNotes: 'MasterChef contract — highest CAKE holder' } });
    await prisma.holder.create({ data: { projectId: cake.id, walletAddress: '0x000000000000000000000000000000000000dEaD', chain: 'bnb', balance: 50000000, percentage: 6.67, isWhale: true } });
    console.log('   ✓ 9 holders');

    // Events
    await prisma.event.create({ data: { projectId: bonk.id, type: 'parse_completed', severity: 'success', message: 'Parsed 3 holders for Bonk (Solana)' } });
    await prisma.event.create({ data: { projectId: uni.id, type: 'parse_completed', severity: 'success', message: 'Parsed 2 holders for Uniswap (Ethereum)' } });
    await prisma.event.create({ data: { projectId: cake.id, type: 'parse_completed', severity: 'success', message: 'Parsed 2 holders for PancakeSwap (BNB)' } });
    await prisma.event.create({ data: { projectId: bonk.id, type: 'ai_analysis', severity: 'warning', message: 'AI detected potential insider wallet: HN7cABq... holds 26.7% of BONK' } });
    await prisma.event.create({ data: { projectId: pepe.id, type: 'token_created', severity: 'success', message: 'Token "Pepe" (PEPE) on ethereum registered' } });
    await prisma.event.create({ data: { type: 'system_start', severity: 'info', message: 'Zota multi-chain parsing engine initialized' } });
    await prisma.event.create({ data: { projectId: cake.id, type: 'ai_analysis', severity: 'info', message: 'AI: PancakeSwap MasterChef contract identified as top holder' } });
    console.log('   ✓ 7 events');

    console.log('✅ Seed complete!');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
