import { NextRequest } from 'next/server';
import { getCleaningSuggestions } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, columns, userRules } = body;

    if (!data || !columns) {
      return Response.json({ error: 'Missing data or columns' }, { status: 400 });
    }

    const suggestions = await getCleaningSuggestions(data, columns, userRules || {});

    return Response.json({
      success: true,
      suggestions,
      totalSuggestions: suggestions.length,
    });
  } catch (error) {
    console.error('Clean API error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to generate cleaning suggestions' },
      { status: 500 }
    );
  }
}
