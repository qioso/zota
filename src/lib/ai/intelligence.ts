// Main Multi-Chain Intelligence Agent
// Orchestrates EVM, Solana, CoinGecko, DexScreener, and Twitter data

import { getTokenHolders, getTokenTransfers, EVM_CHAINS } from '../blockchain/evm';
import { getSolanaTokenHolders } from '../blockchain/solana';
import { getCoinDetail, getTokenPriceByContract, searchCoin, getTrendingCoins } from '../blockchain/prices';
import { getDexPairsByToken, searchDexPairs, getTradingActivity, extractSocialLinks, type DexPair } from '../blockchain/dexscreener';
import { analyzeSocialSentiment } from '../blockchain/social';
import { prisma } from '../prisma';

export interface HolderIntelligence {
    walletAddress: string;
    chain: string;
    balance: number;
    percentage: number | null;
    // On-chain analysis
    recentTransactions: number;
    isWhale: boolean;
    isInsider: boolean;
    riskScore: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskNumeric: number;
    confidence: number;
    flags: string[];
    recommendation: string;
    // AI notes
    aiNotes: string;
}

export interface ProjectIntelligence {
    projectId: string;
    name: string;
    symbol: string;
    chain: string;
    contractAddress: string;
    // Price data
    priceUsd: number | null;
    priceChange24h: number | null;
    marketCap: number | null;
    volume24h: number | null;
    liquidity: number | null;
    // Holder data
    holderCount: number;
    topHolders: { address: string; percentage: number }[];
    whaleCount: number;
    concentration: number; // % held by top 10
    // Social data
    twitterFollowers: number | null;
    twitterMentions: number;
    sentimentScore: number;
    isViral: boolean;
    // Risk assessment
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    flags: string[];
    // DEX data
    dexUrl: string | null;
    buyPressure: number | null;
    isSuspiciousVolume: boolean;
    // Social links
    website: string | null;
    twitter: string | null;
    telegram: string | null;
}

// ─── Holder Analysis ────────────────────────────────────────────────────────

export async function analyzeHolder(holderId: string): Promise<HolderIntelligence> {
    const holder = await prisma.holder.findUnique({
        where: { id: holderId },
        include: { project: true }
    });

    if (!holder) throw new Error('Holder not found');

    // Use any cast to access chain property which might be missing in stale client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain = (holder as any).chain || (holder.project as any).chain || (holder.project as any).network || 'solana';
    const address = holder.walletAddress;

    // 2. Fetch wallet history
    let history: any[] = [];
    if (chain === 'solana') {
        // history = await getSolanaTransactionHistory(address);
    } else if (EVM_CHAINS.includes(chain)) {
        // history = await getEvmTransactionHistory(chain, address);
    }
    const flags: string[] = [];
    let riskNumeric = 0;

    // 1. Whale detection
    if (holder.percentage && holder.percentage > 10) {
        flags.push(`🐋 Whale: holds ${holder.percentage.toFixed(2)}% of supply`);
        riskNumeric += 30;
    }
    if (holder.percentage && holder.percentage > 25) {
        flags.push('⚠️ Dominant: controls >25% of supply');
        riskNumeric += 25;
    }

    // 2. On-chain transaction analysis
    let recentTransactions = 0;
    if (chain === 'solana') {
        // Solana: check via Solscan (no contract needed)
        recentTransactions = 0; // Will be enriched if project has mintAddress
    } else if (!!EVM_CHAINS[chain]) {
        // EVM: get recent transactions
        const project = await prisma.project.findUnique({ where: { id: holder.projectId } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pAny = project as any;
        const cAddr = pAny?.contractAddress || pAny?.mintAddress;
        if (cAddr) {
            const txns = await getTokenTransfers(chain, cAddr, holder.walletAddress);
            recentTransactions = txns.length;

            // Check for rapid accumulation (many buys in short time)
            if (txns.length > 10) {
                const inbound = txns.filter(t => t.to?.toLowerCase() === holder.walletAddress.toLowerCase());
                if (inbound.length > 8) {
                    flags.push(`📈 Rapid accumulation: ${inbound.length} inbound transfers recently`);
                    riskNumeric += 20;
                }
            }
        }
    }

    // 3. Balance magnitude
    if (holder.balance > 1_000_000_000) {
        flags.push(`💰 Extremely high balance: ${(holder.balance / 1e9).toFixed(2)}B tokens`);
        riskNumeric += 10;
    }

    // 4. Early holder detection
    const daysSinceFirstSeen = Math.floor(
        (Date.now() - new Date(holder.firstSeen).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceFirstSeen < 7) {
        flags.push('🕐 New holder: first seen within last 7 days');
        riskNumeric += 10;
    }

    // 5. Insider pattern
    const isInsider = riskNumeric >= 50 || (holder.percentage ?? 0) > 20;
    if (isInsider) {
        flags.push('🔴 Potential insider: matches accumulation pattern');
        riskNumeric += 20;
    }

    // 6. Address format check
    if (chain === 'ethereum' || chain === 'bnb') {
        if (!holder.walletAddress.startsWith('0x') || holder.walletAddress.length !== 42) {
            flags.push('⚡ Non-standard EVM address format');
            riskNumeric += 5;
        }
    }

    riskNumeric = Math.min(100, riskNumeric);
    const isWhale = (holder.percentage ?? 0) > 5 || holder.balance > 500_000_000;

    const riskLevel: HolderIntelligence['riskLevel'] =
        riskNumeric < 20 ? 'low' :
            riskNumeric < 40 ? 'medium' :
                riskNumeric < 70 ? 'high' : 'critical';

    const riskScore = riskLevel;

    const recommendation =
        riskLevel === 'critical' ? 'Immediate investigation. Strong insider trading signals detected.' :
            riskLevel === 'high' ? 'Monitor closely. Track wallet for unusual activity.' :
                riskLevel === 'medium' ? 'Standard monitoring. Some risk factors present.' :
                    'No immediate concerns. Normal holder behavior.';

    const aiNotes = flags.length > 0
        ? `${flags.join(' | ')} — ${recommendation}`
        : 'No suspicious patterns detected.';

    // Update holder with risk info - commented out due to stale Prisma client
    /*
    await prisma.holder.update({
        where: { id: holderId },
        data: {
            isWhale,
            riskScore: riskLevel,
            aiNotes: `Flags: ${flags.join(', ')}`,
        },
    });
    */

    await (prisma as any).aiAnalysis.create({
        data: {
            entityType: 'holder',
            entityId: holderId,
            analysisType: 'holder_risk',
            result: JSON.stringify({ riskLevel, riskNumeric, flags, isInsider, isWhale, recentTransactions }),
            confidence: Math.min(95, 60 + flags.length * 8),
        },
    });

    return {
        walletAddress: holder.walletAddress,
        chain: chain,
        balance: holder.balance,
        percentage: holder.percentage,
        recentTransactions,
        isWhale,
        isInsider,
        riskScore,
        riskLevel,
        riskNumeric,
        confidence: Math.min(95, 60 + flags.length * 8),
        flags,
        recommendation,
        aiNotes,
    };
}

// ─── Project Intelligence ────────────────────────────────────────────────────

export async function analyzeProject(projectId: string): Promise<ProjectIntelligence> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');

    const flags: string[] = [];
    let riskScore = 0;

    // Handle stale client fields (network vs chain, missing contractAddress)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pAny = project as any;
    const chain = pAny.chain || pAny.network || 'solana';
    const contractAddress = pAny.contractAddress || pAny.mintAddress || '';
    const symbol = project.symbol;
    const name = project.name;

    // Parallel data fetching
    const [holders, dexPairs, geckoSearch] = await Promise.all([
        prisma.holder.findMany({ where: { projectId }, orderBy: { balance: 'desc' } }),
        contractAddress ? getDexPairsByToken(contractAddress) : searchDexPairs(`${symbol}`),
        searchCoin(symbol),
    ]);

    // Best DEX pair (highest liquidity)
    const bestPair = dexPairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    const trading = bestPair ? getTradingActivity(bestPair) : null;
    const socialLinks = bestPair ? extractSocialLinks(bestPair) : {};

    // CoinGecko detail
    const geckoId = geckoSearch[0]?.id;
    const geckoDetail = geckoId ? await getCoinDetail(geckoId) : null;

    // Price from contract or CoinGecko
    let priceUsd: number | null = null;
    if (contractAddress && chain !== 'solana') {
        priceUsd = await getTokenPriceByContract(chain, contractAddress);
    }
    if (!priceUsd && geckoDetail) {
        priceUsd = geckoDetail.market_data.current_price.usd;
    }
    if (!priceUsd && bestPair?.priceUsd) {
        priceUsd = parseFloat(bestPair.priceUsd);
    }

    // Social sentiment
    const twitterHandle = geckoDetail?.links?.twitter_screen_name || socialLinks.twitter?.split('/').pop();
    const sentiment = await analyzeSocialSentiment(symbol, name);

    // Holder analysis
    const holderCount = holders.length;
    const totalBalance = holders.reduce((s, h) => s + h.balance, 0);
    const topHolders = holders.slice(0, 10).map(h => ({
        address: h.walletAddress,
        percentage: totalBalance > 0 ? (h.balance / totalBalance) * 100 : 0,
    }));
    const whaleCount = holders.filter(h => (h.percentage ?? 0) > 5).length;
    const concentration = topHolders.reduce((s, h) => s + h.percentage, 0);

    // On-chain holder enrichment for EVM
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (contractAddress && !!(EVM_CHAINS as any)[chain] && holderCount < 5) {
        const onChainHolders = await getTokenHolders(chain, contractAddress);
        if (onChainHolders.length > holderCount) {
            flags.push(`📊 On-chain: ${onChainHolders.length} holders found (${holderCount} tracked locally)`);
        }
    }

    // Risk flags
    if (holderCount < 5) { flags.push(`⚠️ Very few tracked holders: ${holderCount}`); riskScore += 20; }
    if (whaleCount > 2) { flags.push(`🐋 ${whaleCount} whales holding >5% each`); riskScore += whaleCount * 10; }
    if (concentration > 60) { flags.push(`🔴 Top 10 holders control ${concentration.toFixed(1)}% of supply`); riskScore += 30; }
    if (trading?.isSuspiciousVolume) { flags.push('🚨 Suspicious: high volume with low liquidity'); riskScore += 25; }
    if (sentiment.isSuspiciousActivity) { flags.push('🤖 Suspicious social: possible bot activity detected'); riskScore += 15; }
    if (sentiment.isViral) { flags.push('🔥 Viral: trending on Twitter/X'); }
    if (trading && trading.buyPressure > 80) { flags.push(`📈 Strong buy pressure: ${trading.buyPressure}% buys`); }
    if (trading && trading.buyPressure < 20) { flags.push(`📉 Heavy selling: only ${trading.buyPressure}% buys`); riskScore += 20; }

    riskScore = Math.min(100, riskScore);
    const overallRisk: ProjectIntelligence['overallRisk'] =
        riskScore < 20 ? 'low' :
            riskScore < 40 ? 'medium' :
                riskScore < 70 ? 'high' : 'critical';

    // Save analysis
    await (prisma as any).aiAnalysis.create({
        data: {
            entityType: 'project',
            entityId: projectId,
            analysisType: 'project_risk',
            result: JSON.stringify({ overallRisk, riskScore, flags, holderCount, whaleCount, concentration }),
            confidence: Math.min(95, 50 + flags.length * 5),
        },
    });

    return {
        projectId,
        name,
        symbol,
        chain,
        contractAddress,
        priceUsd,
        priceChange24h: trading?.priceChange24h ?? geckoDetail?.market_data.price_change_percentage_24h ?? null,
        marketCap: geckoDetail?.market_data.market_cap.usd ?? null,
        volume24h: trading?.volume24h ?? null,
        liquidity: trading?.liquidity ?? null,
        holderCount,
        topHolders,
        whaleCount,
        concentration,
        twitterFollowers: geckoDetail?.community_data.twitter_followers ?? null,
        twitterMentions: sentiment.mentionCount,
        sentimentScore: sentiment.sentimentScore,
        isViral: sentiment.isViral,
        overallRisk,
        riskScore,
        flags,
        dexUrl: bestPair?.url ?? null,
        buyPressure: trading?.buyPressure ?? null,
        isSuspiciousVolume: !!trading?.isSuspiciousVolume, // Force boolean
        website: socialLinks.website ?? geckoDetail?.links.homepage[0] ?? null,
        twitter: twitterHandle ? `https://twitter.com/${twitterHandle}` : socialLinks.twitter ?? null,
        telegram: socialLinks.telegram ?? (geckoDetail?.links.telegram_channel_identifier ? `https://t.me/${geckoDetail.links.telegram_channel_identifier}` : null),
    };
}

// ─── Trending Projects Discovery ─────────────────────────────────────────────

export async function discoverTrendingProjects(): Promise<{
    id: string; name: string; symbol: string; rank: number; priceChange24h: number
}[]> {
    const trending = await getTrendingCoins();
    return trending.map(c => ({
        id: c.id,
        name: c.name,
        symbol: c.symbol.toUpperCase(),
        rank: c.market_cap_rank,
        priceChange24h: 0,
    }));
}
