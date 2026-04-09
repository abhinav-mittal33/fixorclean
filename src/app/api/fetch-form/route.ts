import { NextRequest, NextResponse } from 'next/server';
import { parseCSV } from '@/lib/data-processing';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Please provide a valid URL.' }, { status: 400 });
    }

    // Extract Google Sheets/Form URLs
    // Possible formats:
    // 1. Google Form edit URL: https://docs.google.com/forms/d/FORM_ID/edit
    // 2. Google Form response URL: https://docs.google.com/forms/d/e/FORM_ID/viewform
    // 3. Google Sheets URL: https://docs.google.com/spreadsheets/d/SHEET_ID/edit
    
    let csvUrl = '';
    let formTitle = 'google-form-responses';

    // Validate URL scheme to prevent SSRF
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format.' }, { status: 400 });
    }
    if (parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only HTTPS URLs are supported.' }, { status: 400 });
    }

    // Google Sheets URL → export as CSV
    const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/);
    if (sheetsMatch) {
      const sheetId = sheetsMatch[1];
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      formTitle = `sheet-${sheetId.substring(0, 8)}`;
    }

    // Google Form published URL (e/ prefix) — must be checked BEFORE the general forms/d/ edit regex
    // because /forms/d/e/ also matches /forms/d/ and would capture 'e' as the form ID
    const formPublishMatch = url.match(/docs\.google\.com\/forms\/d\/e\/([^/]+)/);
    if (!csvUrl && formPublishMatch) {
      // Published forms don't directly expose CSV — user needs the Sheets link
      return NextResponse.json({
        error: 'This is a published Google Form link. To fetch responses, please use the linked Google Sheet URL instead. Open the Form → Responses tab → Click the green Sheets icon → Copy that URL and paste it here.'
      }, { status: 400 });
    }

    // Google Form edit URL → try to get linked spreadsheet
    const formEditMatch = url.match(/docs\.google\.com\/forms\/d\/([^/]+)/);
    if (!csvUrl && formEditMatch) {
      const formId = formEditMatch[1];
      csvUrl = `https://docs.google.com/forms/d/${formId}/downloadresponses?format=csv`;
      formTitle = `form-${formId.substring(0, 8)}`;
    }

    if (!csvUrl) {
      // Try treating it as a direct CSV/Sheets URL
      if (url.includes('docs.google.com')) {
        return NextResponse.json({
          error: 'Could not parse this Google URL. Please paste a Google Sheets URL (spreadsheets/d/...) or a Google Form URL (forms/d/...).'
        }, { status: 400 });
      }
      // Try fetching it as a raw external CSV URL (already validated as https above)
      csvUrl = url;
    }

    // Fetch the CSV data
    const response = await fetch(csvUrl, {
      headers: {
        'User-Agent': 'FixOrClean/1.0',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({ 
          error: 'Access denied. The spreadsheet or form responses must be shared publicly ("Anyone with the link"). Go to Google Sheets → Share → Change to "Anyone with the link" → Viewer.' 
        }, { status: 403 });
      }
      return NextResponse.json({ 
        error: `Failed to fetch data from the URL (HTTP ${response.status}). Make sure the link is correct and publicly accessible.` 
      }, { status: 400 });
    }

    const csvText = await response.text();
    
    // Check if we got HTML instead of CSV (common when access is denied)
    if (csvText.trim().startsWith('<!DOCTYPE') || csvText.trim().startsWith('<html')) {
      return NextResponse.json({ 
        error: 'The link returned an HTML page instead of CSV data. The spreadsheet is likely not shared publicly. Go to Google Sheets → Share → Change to "Anyone with the link" → Viewer.' 
      }, { status: 400 });
    }

    // Parse CSV using shared parsing logic
    const parsed = parseCSV(csvText);

    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      return NextResponse.json({ error: 'The fetched data appears to be empty. Make sure the form has responses.' }, { status: 400 });
    }

    // Cap at 5000 rows
    const rows = parsed.rows.slice(0, 5000);

    return NextResponse.json({
      filename: `${formTitle}.csv`,
      headers: parsed.headers,
      rows,
      columns: parsed.columns,
      totalRows: rows.length,
    });
  } catch (err) {
    console.error('Fetch form error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch form data.' },
      { status: 500 }
    );
  }
}
