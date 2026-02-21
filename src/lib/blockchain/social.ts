// Twitter/X social data fetcher

export interface Tweet {
    id: string;
    text: string;
    created_at: string;
    author_id: string;
    public_metrics: {
        retweet_count: number;
        reply_count: number;
        like_count: number;
        impression_count: number;
    };
}

export interface TwitterUser {
    id: string;
    name: string;
    username: string;
    public_metrics: {
        followers_count: number;
        following_count: number;
        tweet_count: number;
    };
    verified: boolean;
    description: string;
}

export interface SocialSentiment {
    mentionCount: number;
    totalEngagement: number;
    avgLikes: number;
    avgRetweets: number;
    sentimentScore: number; // -100 to 100
    topTweets: Tweet[];
    influencerMentions: number;
    isViral: boolean;
    isSuspiciousActivity: boolean;
}

const TWITTER_BASE = 'https://api.twitter.com/2';
const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN || '';

async function twitterFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
    if (!BEARER_TOKEN) return null;
    try {
        const url = new URL(`${TWITTER_BASE}${endpoint}`);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

        const res = await fetch(url.toString(), {
            headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` },
            next: { revalidate: 300 }, // 5 min cache
        });

        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

// Search recent tweets mentioning a token
export async function searchTokenMentions(symbol: string, name: string): Promise<Tweet[]> {
    const query = `($${symbol} OR "${name}") -is:retweet lang:en`;
    const result = await twitterFetch<{ data: Tweet[] }>('/tweets/search/recent', {
        query,
        max_results: '20',
        'tweet.fields': 'created_at,public_metrics,author_id',
    });
    return result?.data ?? [];
}

// Get a Twitter user by username
export async function getTwitterUser(username: string): Promise<TwitterUser | null> {
    const result = await twitterFetch<{ data: TwitterUser }>(`/users/by/username/${username}`, {
        'user.fields': 'public_metrics,verified,description',
    });
    return result?.data ?? null;
}

// Get recent tweets from a project's official account
export async function getProjectTweets(username: string): Promise<Tweet[]> {
    const user = await getTwitterUser(username);
    if (!user) return [];

    const result = await twitterFetch<{ data: Tweet[] }>(`/users/${user.id}/tweets`, {
        max_results: '10',
        'tweet.fields': 'created_at,public_metrics',
        exclude: 'retweets,replies',
    });
    return result?.data ?? [];
}

// Analyze social sentiment for a token
export async function analyzeSocialSentiment(symbol: string, name: string): Promise<SocialSentiment> {
    const tweets = await searchTokenMentions(symbol, name);

    if (tweets.length === 0) {
        return {
            mentionCount: 0,
            totalEngagement: 0,
            avgLikes: 0,
            avgRetweets: 0,
            sentimentScore: 0,
            topTweets: [],
            influencerMentions: 0,
            isViral: false,
            isSuspiciousActivity: false,
        };
    }

    const totalLikes = tweets.reduce((s, t) => s + (t.public_metrics?.like_count ?? 0), 0);
    const totalRetweets = tweets.reduce((s, t) => s + (t.public_metrics?.retweet_count ?? 0), 0);
    const totalEngagement = totalLikes + totalRetweets;
    const avgLikes = Math.round(totalLikes / tweets.length);
    const avgRetweets = Math.round(totalRetweets / tweets.length);

    // Simple sentiment: high engagement = positive signal
    const sentimentScore = Math.min(100, Math.round((totalEngagement / tweets.length) * 2));

    // Detect suspicious patterns: many tweets with very low engagement (bot activity)
    const lowEngagementTweets = tweets.filter(t => (t.public_metrics?.like_count ?? 0) < 2).length;
    const isSuspiciousActivity = lowEngagementTweets > tweets.length * 0.7 && tweets.length > 10;

    // Sort by engagement for top tweets
    const topTweets = [...tweets]
        .sort((a, b) => (b.public_metrics?.like_count ?? 0) - (a.public_metrics?.like_count ?? 0))
        .slice(0, 3);

    return {
        mentionCount: tweets.length,
        totalEngagement,
        avgLikes,
        avgRetweets,
        sentimentScore,
        topTweets,
        influencerMentions: tweets.filter(t => (t.public_metrics?.like_count ?? 0) > 100).length,
        isViral: totalEngagement > 10000,
        isSuspiciousActivity,
    };
}
