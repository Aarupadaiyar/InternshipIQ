import docx

def extract_docx(content: bytes) -> str:
    """Extract raw text from a DOCX file.
    Uses python-docx to read the document.
    """
    from io import BytesIO
    doc = docx.Document(BytesIO(content))
    texts = [para.text for para in doc.paragraphs]
    return "\n".join(texts)
