import fitz  # PyMuPDF
from typing import Tuple, List

# Optional OCR imports – safe to ignore if not installed
try:
    from PIL import Image
except ImportError:
    Image = None
try:
    import pytesseract
except ImportError:
    pytesseract = None

def _detect_pdf_type(doc: fitz.Document) -> str:
    """Detect PDF content nature.
    Returns one of: 'text', 'mixed', 'image-only'.
    """
    has_text = False
    has_images = False
    for page in doc:
        if page.get_text("text").strip():
            has_text = True
        if page.get_images():
            has_images = True
    if has_text and has_images:
        return "mixed"
    if has_text:
        return "text"
    return "image-only"

def _ocr_page(page: fitz.Page) -> str:
    """Run OCR on a PDF page using pytesseract.
    Returns extracted text or empty string if OCR dependencies are missing.
    """
    if Image is None or pytesseract is None:
        return ""
    pix = page.get_pixmap(dpi=200)
    mode = "RGB" if pix.n == 3 else "RGBA"
    img = Image.frombytes(mode, [pix.width, pix.height], pix.samples)
    return pytesseract.image_to_string(img)

def extract_pdf(content: bytes) -> Tuple[str, str]:
    """Extract raw text from a PDF and report its type.
    Returns (text, pdf_type) where pdf_type is 'text', 'mixed', or 'image-only'.
    """
    doc = fitz.open(stream=content, filetype="pdf")
    pdf_type = _detect_pdf_type(doc)
    texts = []
    for page in doc:
        # Block‑based extraction preserving reading order
        blocks = page.get_text("blocks")
        blocks = [b for b in blocks if b[4].strip()]
        blocks.sort(key=lambda b: (b[1], b[0]))
        page_text = "\n".join(b[4].strip() for b in blocks)
        if not page_text and pdf_type == "image-only":
            page_text = _ocr_page(page)
        texts.append(page_text)
    return "\n".join(texts), pdf_type

def extract_pdf_links(content: bytes) -> List[str]:
    """Extract all URI annotations / hyperlink URLs from a PDF.
    Returns a list of URL strings.
    """
    doc = fitz.open(stream=content, filetype="pdf")
    links: List[str] = []
    for page in doc:
        for link in page.get_links():
            uri = link.get('uri')
            if uri:
                links.append(uri)
    return links
