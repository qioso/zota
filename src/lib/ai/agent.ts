import { prisma } from '@/lib/prisma';

export interface AnalysisResult {
    summary: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    isInsider: boolean;
    confidence: number;
    flags: string[];
    recommendation: string;
}

// Analyze a holder's wallet for suspicious patterns
export async function analyzeHolder(holderId: string): Promise<AnalysisResult> {
    const holder = await prisma.holder.findUnique({ where: { id: holderId } });
    if (!holder) throw new Error('Holder not found');
    const project = await prisma.project.findUnique({ where: { id: holder.projectId } });

    const flags: string[] = [];
    let riskScore = 0;

    // Whale detection
    if (holder.percentage && holder.percentage > 10) {
        flags.push(`🐋 Whale: holds ${holder.percentage.toFixed(2)}% of supply`);
        riskScore += 30;
    }
    if (holder.percentage && holder.percentage > 25) {
        flags.push('⚠️ Dominant holder: controls >25% of supply');
        riskScore += 25;
    }

    // Balance analysis
    if (holder.balance > 1_000_000_000) {
        flags.push(`💰 Extremely high balance: ${holder.balance.toLocaleString()}`);
        riskScore += 15;
    }

    // Early holder detection
    const daysSinceFirstSeen = Math.floor(
        (Date.now() - new Date(holder.firstSeen).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceFirstSeen < 7) {
        flags.push('🕐 Recent holder: first seen within last 7 days');
        riskScore += 10;
    }

    // Insider pattern detection
    const isInsider = riskScore >= 50 || (holder.percentage ?? 0) > 20;
    if (isInsider) {
        flags.push('🔴 Potential insider: matches insider accumulation pattern');
        riskScore += 20;
    }

    // Wallet analysis based on chain
    const chain = (holder as any).chain || 'solana';
    if (chain === 'solana') {
        if (holder.walletAddress.length < 32) {
            flags.push('⚡ Unusual Solana address format');
            riskScore += 5;
        }
    } else if (chain === 'ethereum' || chain === 'bnb') {
        if (!holder.walletAddress.startsWith('0x')) {
            flags.push('⚡ Non-standard address for EVM chain');
            riskScore += 5;
        }
    }

    // Clamp risk score
    riskScore = Math.min(100, riskScore);

    const riskLevel: AnalysisResult['riskLevel'] =
        riskScore < 20 ? 'low' :
            riskScore < 40 ? 'medium' :
                riskScore < 70 ? 'high' : 'critical';

    const recommendation =
        riskLevel === 'critical' ? 'Immediate investigation recommended. This wallet shows strong insider trading patterns.' :
            riskLevel === 'high' ? 'Monitor closely. Consider tracking wallet transactions for unusual activity.' :
                riskLevel === 'medium' ? 'Standard monitoring recommended. Some risk factors present.' :
                    'No immediate concerns. Normal holder behavior.';

    const summary = `Holder ${holder.walletAddress.substring(0, 8)}... analyzed on ${chain}${project ? ` (${project.name})` : ''}. ` +
        `Risk: ${riskLevel} (${riskScore}/100). ` +
        `${flags.length} flag(s) detected. ` +
        (isInsider ? 'Potential insider detected.' : 'No insider indicators.');

    return {
        summary,
        riskLevel,
        isInsider,
        confidence: Math.min(95, 60 + flags.length * 8),
        flags,
        recommendation,
    };
}

// Analyze a project's overall holder distribution
export async function analyzeProject(projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');

    const holders = await prisma.holder.findMany({
        where: { projectId },
        orderBy: { balance: 'desc' },
    });

    const totalHolders = holders.length;
    const whales = holders.filter(h => (h.percentage ?? 0) > 5);
    const topHolderPercentage = holders.reduce((sum, h) => sum + (h.percentage ?? 0), 0);

    const flags: string[] = [];
    let riskScore = 0;

    if (totalHolders < 5) {
        flags.push(`⚠️ Very few holders: only ${totalHolders}`);
        riskScore += 25;
    }

    if (whales.length > 0) {
        flags.push(`🐋 ${whales.length} whale(s) holding >5% each`);
        riskScore += whales.length * 10;
    }

    if (topHolderPercentage > 50) {
        flags.push(`🔴 Top holders control ${topHolderPercentage.toFixed(1)}% of supply`);
        riskScore += 30;
    }

    riskScore = Math.min(100, riskScore);
    const riskLevel = riskScore < 20 ? 'low' : riskScore < 40 ? 'medium' : riskScore < 70 ? 'high' : 'critical';

    // Handle stale client fields
    const pAny = project as any;
    const chain = pAny.chain || pAny.network || 'solana';

    return {
        project: project.name,
        chain: chain,
        totalHolders,
        whaleCount: whales.length,
        concentration: topHolderPercentage.toFixed(1) + '%',
        riskLevel,
        riskScore,
        flags,
        summary: `${project.name} (${project.symbol}) on ${chain}: ${totalHolders} holders, ${whales.length} whales, ${topHolderPercentage.toFixed(1)}% concentration. Risk: ${riskLevel}.`,
    };
}
