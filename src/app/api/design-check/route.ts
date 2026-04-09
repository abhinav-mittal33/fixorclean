import { NextRequest, NextResponse } from 'next/server';
import { checkSurveyDesign } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Please provide a valid URL.' }, { status: 400 });
    }

    // Validate URL to prevent SSRF — only allow HTTPS requests to known form providers
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format.' }, { status: 400 });
    }
    if (parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only HTTPS URLs are supported.' }, { status: 400 });
    }
    const allowedHosts = ['docs.google.com', 'forms.google.com', 'forms.gle', 'typeform.com', 'www.typeform.com'];
    if (!allowedHosts.some(h => parsedUrl.hostname === h || parsedUrl.hostname.endsWith('.' + h))) {
      return NextResponse.json({ error: 'URL must be a Google Forms or Typeform link.' }, { status: 400 });
    }

    // Fetch the survey page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FixOrClean/1.0',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch data from the URL (HTTP ${response.status}). Make sure the link is correct and publicly accessible.` 
      }, { status: 400 });
    }

    const htmlText = await response.text();
    
    // Multi-page Google Forms store the entire form structure in this Javascript variable
    const fbDataMatch = htmlText.match(/var FB_PUBLIC_LOAD_DATA_ = (\[[\s\S]*?\]);<\/script>/);
    let readableQuestions: string[] = [];
    if (fbDataMatch) {
      try {
        const parsed = JSON.parse(fbDataMatch[1]);
        // Recursively extract strings to avoid dumping raw complex arrays into the LLM context
        const extractStrings = (obj: any) => {
          if (typeof obj === 'string' && obj.trim().length > 5) {
            readableQuestions.push(obj.trim());
          } else if (Array.isArray(obj)) {
            obj.forEach(extractStrings);
          }
        };
        extractStrings(parsed);
        // Deduplicate strings to keep context clean
        readableQuestions = Array.from(new Set(readableQuestions));
      } catch (e) {
        // Fallback if parsing fails
        const matches = fbDataMatch[1].match(/\"([^\"]{5,})\"/g);
        if (matches) readableQuestions = matches.map(m => m.slice(1, -1));
      }
    }
    
    // Rudimentary HTML to text converter
    // Strip styles, scripts, then tags
    let rawText = htmlText
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Combine visual text and hidden structure data text
    rawText = rawText + "\n\nForm Content Parsed:\n" + readableQuestions.join('\n');

    // Call the LLM to process the raw text
    const designScore = await checkSurveyDesign(rawText);

    // If Llama returns empty, provide a fallback generic response 
    if (!designScore || !designScore.dimensions) {
      return NextResponse.json({ error: 'Failed to generate design score from the provided link.' }, { status: 500 });
    }

    return NextResponse.json(designScore);
  } catch (err) {
    console.error('Design check error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to analyze design.' },
      { status: 500 }
    );
  }
}
