import fitz
import sys

resume_path = "C:/Users/aarup/OneDrive/Desktop/repository folder/InternshipIQ/Aarupadaiyar_KJ_General_CV ATS-84.pdf"

doc = fitz.open(resume_path)
texts = []
links = []

has_text = False
has_images = False

for page in doc:
    if page.get_text("text").strip():
        has_text = True
    if page.get_images():
        has_images = True
        
    blocks = page.get_text("blocks")
    blocks = [b for b in blocks if b[4].strip()]
    blocks.sort(key=lambda b: (b[1], b[0]))
    page_text = "\n".join(b[4].strip() for b in blocks)
    texts.append(page_text)
    
    for link in page.get_links():
        uri = link.get('uri')
        if uri:
            links.append(uri)

if has_text and has_images:
    pdf_type = "mixed"
elif has_text:
    pdf_type = "text"
else:
    pdf_type = "image-only"

raw_text = "\n".join(texts)

with open("raw_text_preview.txt", "w", encoding="utf-8") as f:
    f.write(f"PDF Type: {pdf_type}\n")
    f.write("Hyperlinks:\n")
    for link in links:
        f.write(f"- {link}\n")
    f.write("\nFirst 100 lines of raw text:\n")
    lines = raw_text.split("\n")
    for line in lines[:100]:
        f.write(f"{line}\n")
