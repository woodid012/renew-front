export const dynamic = 'force-dynamic';

// app/api/update-portfolio-title/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function POST(request) {
    try {
        // Accept both 'portfolioTitle' (new) and 'platformName' (legacy) for backwards compatibility
        const body = await request.json();
        const { unique_id, portfolioTitle, platformName } = body;
        const newTitle = portfolioTitle || platformName;

        if (!unique_id || !unique_id.trim()) {
            return NextResponse.json({ error: 'unique_id is required' }, { status: 400 });
        }

        if (!newTitle || !newTitle.trim()) {
            return NextResponse.json({ error: 'portfolioTitle is required' }, { status: 400 });
        }

        const portfolioUniqueId = unique_id.trim();
        const newPortfolioTitle = newTitle.trim();

        const client = await clientPromise
        const db = client.db('renew_assets')

        // Check if portfolio exists by unique_id
        const existing = await db.collection('CONFIG_Inputs').findOne({
            unique_id: portfolioUniqueId
        });

        if (!existing) {
            return NextResponse.json({
                error: 'Portfolio not found for the provided unique_id',
                unique_id: portfolioUniqueId
            }, { status: 404 });
        }

        const previousTitle = existing.PortfolioTitle;

        // Update PortfolioTitle for all documents with this unique_id
        const updateResult = await db.collection('CONFIG_Inputs').updateMany(
            { unique_id: portfolioUniqueId },
            { $set: { PortfolioTitle: newPortfolioTitle } }
        );

        if (updateResult.matchedCount === 0) {
            return NextResponse.json({
                error: 'Portfolio not found'
            }, { status: 404 });
        }

        if (updateResult.modifiedCount === 0) {
            return NextResponse.json({
                success: true,
                message: 'PortfolioTitle unchanged (already set to this value)',
                unique_id: portfolioUniqueId,
                portfolioTitle: newPortfolioTitle,
                documentsMatched: updateResult.matchedCount
            });
        }

        return NextResponse.json({
            success: true,
            message: 'PortfolioTitle updated successfully',
            unique_id: portfolioUniqueId,
            portfolioTitle: newPortfolioTitle,
            previousTitle: previousTitle,
            documentsMatched: updateResult.matchedCount,
            documentsModified: updateResult.modifiedCount
        });
    } catch (error) {
        console.error('Failed to update PortfolioTitle:', error);
        return NextResponse.json({
            error: 'Failed to update PortfolioTitle',
            details: error.message
        }, { status: 500 });
    }
}
