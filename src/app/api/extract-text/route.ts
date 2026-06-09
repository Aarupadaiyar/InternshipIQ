import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    let text = ''

    if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
      text = await extractPDFText(buffer)
    } else if (
      file.name.endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else if (file.name.endsWith('.txt') || file.type === 'text/plain') {
      text = buffer.toString('utf-8')
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Use PDF, DOCX, or TXT.' }, { status: 400 })
    }

    if ((!text || text.trim().length < 20) && (file.name.endsWith('.pdf') || file.type === 'application/pdf')) {
      text = await extractWithGeminiOcr(buffer, file.type || 'application/pdf')
    }

    if (!text || text.trim().length < 20) {
      return NextResponse.json(
        { error: 'Could not extract text from file. Configure GEMINI_API_KEY for OCR fallback or upload DOCX/TXT.', ocrRequired: true },
        { status: 422 }
      )
    }

    return NextResponse.json({ text: text.trim() })
  } catch (err) {
    console.error('Text extraction error:', err)
    return NextResponse.json(
      { error: 'Failed to extract text: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    )
  }
}

async function extractWithGeminiOcr(buffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your-gemini-api-key-here') return ''

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent([
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType,
        },
      },
      'Extract all readable resume text from this document. Preserve section headings and line breaks. Return plain text only.',
    ])
    return result.response.text().trim()
  } catch (error) {
    console.error('Gemini OCR fallback failed:', error)
    return ''
  }
}

async function extractPDFText(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse handles Node.js server-side correctly, no worker needed
    // Import from lib directly to avoid Next.js test file detection issue
    // @ts-ignore
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default
    const data = await pdfParse(buffer)
    return data.text
  } catch (e) {
    console.error('pdf-parse error, trying pdfjs fallback:', e)
    return extractPDFTextFallback(buffer)
  }
}

// Fallback: try pdfjs-dist with proper Node.js worker config
async function extractPDFTextFallback(buffer: Buffer): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
    // Point to the bundled worker file for Node.js
    const workerPath = new URL(
      'pdfjs-dist/legacy/build/pdf.worker.mjs',
      import.meta.url
    ).toString()
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
    const pdf = await loadingTask.promise
    const pageTexts: string[] = []

    for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const strings = content.items
        .filter((item: any): item is any => 'str' in item)
        .map((item: any) => item.str)
      pageTexts.push(strings.join(' '))
    }
    return pageTexts.join('\n\n').replace(/\s{3,}/g, '\n').trim()
  } catch (e2) {
    console.error('pdfjs fallback also failed:', e2)
    return ''
  }
}
