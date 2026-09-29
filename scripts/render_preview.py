"""Generate a PNG preview of slide 1 (cover) of the VERA proposal PDF for triple delivery."""
import sys
import os

try:
    import pypdfium2 as pdfium
except ImportError:
    print("Installing pypdfium2...")
    os.system("pip install pypdfium2 -q")
    import pypdfium2 as pdfium

PDF_PATH = "/home/z/my-project/download/VERA_Proposal_Healthkathon2026.pdf"
PNG_PATH = "/home/z/my-project/download/VERA_Proposal_Healthkathon2026_preview.png"

# Render page 1 (cover) at 2x for crisp preview
pdf = pdfium.PdfDocument(PDF_PATH)
page = pdf[0]  # First page = slide 1 cover
bitmap = page.render(scale=2.0)  # 2x scale for high quality
pil_image = bitmap.to_pil()
pil_image.save(PNG_PATH, format="PNG", optimize=True)
print(f"OK: Saved preview PNG to {PNG_PATH}")
print(f"   Size: {os.path.getsize(PNG_PATH) // 1024} KB")
print(f"   Dimensions: {pil_image.size}")
