import { NextRequest } from 'next/server';
import { parseCSV, parseExcel } from '@/lib/data-processing';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const filename = file.name.toLowerCase();

    if (filename.endsWith('.csv') || filename.endsWith('.tsv')) {
      const text = await file.text();
      const parsed = parseCSV(text);
      return Response.json({
        success: true,
        filename: file.name,
        ...parsed,
      });
    }

    if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.ods')) {
      const buffer = await file.arrayBuffer();
      const parsed = parseExcel(buffer);
      return Response.json({
        success: true,
        filename: file.name,
        ...parsed,
      });
    }

    return Response.json(
      { error: 'Unsupported file format. Please upload CSV, TSV, XLSX, XLS, or ODS.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json(
      { error: 'Failed to process file. Please check the format and try again.' },
      { status: 500 }
    );
  }
}
