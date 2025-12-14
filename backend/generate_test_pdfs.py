"""
Generate Sample Test PDFs for Load Testing
This script creates test PDFs of various sizes for performance testing
"""

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import inch
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    print("⚠️ reportlab not installed. Install with: pip install reportlab")

from pathlib import Path
import sys


def generate_test_pdf(filename: str, num_pages: int, complexity: str = "simple"):
    """Generate a test PDF with specified number of pages"""
    if not REPORTLAB_AVAILABLE:
        print("❌ Cannot generate PDFs without reportlab library")
        return False
    
    try:
        c = canvas.Canvas(filename, pagesize=letter)
        width, height = letter
        
        for page_num in range(num_pages):
            # Title
            c.setFont("Helvetica-Bold", 16)
            c.drawString(1*inch, height - 1*inch, f"Test Document - Page {page_num+1} of {num_pages}")
            
            # Document info
            c.setFont("Helvetica", 12)
            c.drawString(1*inch, height - 1.5*inch, f"Filename: {Path(filename).name}")
            c.drawString(1*inch, height - 1.8*inch, f"Complexity: {complexity}")
            c.drawString(1*inch, height - 2.1*inch, f"Generated for load testing")
            
            # Add content based on complexity
            y_position = height - 3*inch
            
            if complexity == "simple":
                # Simple text content
                c.setFont("Helvetica", 10)
                for line in range(10):
                    c.drawString(1*inch, y_position, f"This is line {line+1} of simple text content for testing.")
                    y_position -= 0.3*inch
                    
            elif complexity == "medium":
                # Forms and fields simulation
                c.setFont("Helvetica-Bold", 11)
                c.drawString(1*inch, y_position, "Form Fields:")
                y_position -= 0.4*inch
                
                c.setFont("Helvetica", 10)
                fields = ["Name:", "Address:", "Phone:", "Email:", "Date:", "Signature:"]
                for field in fields:
                    c.drawString(1*inch, y_position, field)
                    c.rect(2*inch, y_position - 0.1*inch, 4*inch, 0.25*inch)
                    y_position -= 0.5*inch
                    
            elif complexity in ["high", "very-high", "extreme"]:
                # Dense text content
                c.setFont("Helvetica", 9)
                sample_text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " \
                             "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. "
                
                for line in range(20):
                    c.drawString(1*inch, y_position, sample_text[:80])
                    y_position -= 0.25*inch
                    if y_position < 1*inch:
                        break
            
            # Page footer
            c.setFont("Helvetica", 8)
            c.drawString(1*inch, 0.5*inch, f"Page {page_num+1}/{num_pages}")
            c.drawString(width - 3*inch, 0.5*inch, f"Generated: Load Test Sample")
            
            c.showPage()
        
        c.save()
        file_size = Path(filename).stat().st_size / 1024  # KB
        print(f"✅ Created: {Path(filename).name} ({num_pages} pages, {file_size:.1f}KB)")
        return True
        
    except Exception as e:
        print(f"❌ Failed to create {filename}: {e}")
        return False


def main():
    """Generate all test PDFs"""
    print("="*80)
    print("📄 GENERATING TEST PDFs FOR LOAD TESTING")
    print("="*80)
    
    if not REPORTLAB_AVAILABLE:
        print("\n❌ reportlab library is required to generate PDFs")
        print("Install with: pip install reportlab")
        print("\nAlternatively, you can:")
        print("  1. Use existing PDF files")
        print("  2. Download sample PDFs from the internet")
        print("  3. Create PDFs manually with any PDF tool")
        sys.exit(1)
    
    test_pdfs_dir = Path("test_pdfs")
    test_pdfs_dir.mkdir(exist_ok=True)
    
    print(f"\n📁 Output directory: {test_pdfs_dir.absolute()}\n")
    
    # Define test PDFs to generate
    pdfs_to_generate = [
        ("1_page_simple.pdf", 1, "simple"),
        ("2_page_form.pdf", 2, "medium"),
        ("10_page_mixed.pdf", 10, "medium"),
        ("50_page_text.pdf", 50, "high"),
        ("100_page_scan.pdf", 100, "very-high"),
        ("300_page_complex.pdf", 300, "extreme"),
    ]
    
    success_count = 0
    for filename, pages, complexity in pdfs_to_generate:
        filepath = test_pdfs_dir / filename
        if generate_test_pdf(str(filepath), pages, complexity):
            success_count += 1
    
    print("\n" + "="*80)
    print(f"✅ Successfully generated {success_count}/{len(pdfs_to_generate)} test PDFs")
    print("="*80)
    print("\n💡 You can now run the load test with: python load_test.py")
    print()


if __name__ == "__main__":
    main()
