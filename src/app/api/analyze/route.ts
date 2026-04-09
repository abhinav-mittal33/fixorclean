import { NextRequest } from 'next/server';
import {
  generateAnalysisInsights,
  generateReportSummary,
  clusterOpenTextResponses,
} from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, columns, action } = body;

    if (!data || !columns) {
      return Response.json({ error: 'Missing data or columns' }, { status: 400 });
    }

    if (action === 'insights') {
      const insights = await generateAnalysisInsights(data, columns);
      return Response.json({ success: true, insights });
    }

    if (action === 'report') {
      const insights = await generateAnalysisInsights(data, columns);
      const summary = await generateReportSummary(data, columns, insights);

      // Find open text columns and cluster them
      const textColumns = columns.filter((c: { type: string }) => c.type === 'open_text');
      const themes: Record<string, unknown[]> = {};

      for (const col of textColumns) {
        const responses = data
          .map((row: Record<string, string>) => row[col.name])
          .filter((v: string) => v && v.trim() !== '');
        if (responses.length > 5) {
          themes[col.name] = await clusterOpenTextResponses(responses);
        }
      }

      return Response.json({
        success: true,
        insights,
        summary,
        themes,
      });
    }

    return Response.json({ error: 'Invalid action. Use "insights" or "report".' }, { status: 400 });
  } catch (error) {
    console.error('Analysis API error:', error);
    return Response.json(
      { error: 'Failed to generate analysis' },
      { status: 500 }
    );
  }
}
