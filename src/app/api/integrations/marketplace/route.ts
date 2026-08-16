import { NextRequest, NextResponse } from 'next/server';
import { getMarketplaceIntegrations } from '@/lib/actions/integration-hub';

/**
 * GET /api/integrations/marketplace - List available marketplace integrations
 * Query params:
 *   - category: Filter by integration type (calendar, email, communication, project_mgmt, etc.)
 *   - q: Search query to filter integrations by name, description, or provider
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const query = searchParams.get('q') || undefined;

    const integrations = await getMarketplaceIntegrations(category, query);

    return NextResponse.json(integrations);
  } catch (error) {
    console.error('Error fetching marketplace integrations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
