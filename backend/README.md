# Document Analysis FastAPI Backend

This is a FastAPI backend that provides document analysis capabilities, migrated from the Supabase Edge Function.

## Features

- **Document Analysis**: OCR, field detection, and template matching
- **PDF Processing**: PyMuPDF integration for PDF to image conversion and text extraction
- **Template Matching**: Smart matching with confidence scoring
- **Field Extraction**: Comprehensive field extraction from documents
- **RESTful API**: Clean FastAPI endpoints with proper error handling
- **Multi-format Support**: Images (PNG, JPEG, WebP) and PDF files

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py          # API endpoints
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py          # Configuration settings
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py         # Pydantic models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── document_analysis.py  # Business logic
│   │   └── pdf_processor.py      # PDF processing with PyMuPDF
│   ├── __init__.py
│   └── main.py               # FastAPI app
├── requirements.txt
└── README.md
```

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set environment variables:**
   ```bash
   export LITELLM_API_URL="https://proxyllm.ximplify.id"
   export LITELLM_API_KEY="your-api-key"
   export SUPABASE_URL="your-supabase-url"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-key"
   ```

3. **Run the server:**
   ```bash
   cd app
   python main.py
   ```

   Or with uvicorn:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

## API Endpoints

### POST `/api/v1/analyze-document`
Analyze a document with AI-powered template matching.

**Request Body:**
```json
{
  "documentData": "data:image/png;base64,...",
  "task": "template_matching",
  "documentName": "document.pdf",
  "userId": "user123",
  "saveToDatabase": true
}
```

**Response:**
```json
{
  "success": true,
  "task": "template_matching",
  "result": {
    "detectedDocumentType": "Government Document",
    "totalExtractedFields": 27,
    "matches": [
      {
        "id": "fallback-5",
        "name": "Vehicle Registration Certificate",
        "confidence": 0.926,
        "version": "1.0",
        "documentType": "Government Document",
        "matchedFields": ["Registration Number", "Owner Name", ...],
        "totalFields": 25
      }
    ]
  },
  "usage": {...},
  "savedDocument": {...}
}
```

### GET `/health`
Health check endpoint.

### GET `/`
Root endpoint with API information.

## Available Tasks

- `ocr`: Extract text from document (PDFs: text extraction, Images: OCR)
- `field_detection`: Extract all fields from document (PDFs: converted to image first)
- `template_matching`: Match document against available templates (PDFs: converted to image first)

## PDF Processing

The backend now includes comprehensive PDF processing using PyMuPDF:

### Features:
- **PDF Detection**: Automatically detects PDF files from data URLs
- **Text Extraction**: Direct text extraction from PDF files (for OCR task)
- **Image Conversion**: High-quality PDF to image conversion (for field detection and template matching)
- **Multi-page Support**: Combines multiple PDF pages into single image
- **High Resolution**: 300 DPI conversion for better OCR accuracy
- **Error Handling**: Graceful fallbacks if PDF processing fails

### Processing Flow:
1. **PDF Detection**: Checks if input is PDF data
2. **Task-based Processing**:
   - `ocr`: Tries text extraction first, falls back to image conversion
   - `field_detection`/`template_matching`: Converts PDF to image
3. **Quality Optimization**: High DPI rendering with size optimization
4. **Multi-page Handling**: Combines pages vertically for comprehensive analysis

## Configuration

The application uses Pydantic settings for configuration. Key settings:

- `LITELLM_API_URL`: LiteLLM API endpoint
- `LITELLM_API_KEY`: LiteLLM API key
- `MIN_CONFIDENCE_THRESHOLD`: Minimum confidence for template matching (default: 60%)

## Migration from Edge Function

This FastAPI backend is a complete migration of the Supabase Edge Function with the following improvements:

- **Better Structure**: Organized into proper modules
- **Type Safety**: Pydantic models for request/response validation
- **Error Handling**: Proper HTTP status codes and error responses
- **Logging**: Structured logging for debugging
- **Configuration**: Environment-based configuration
- **Async Support**: Full async/await support for better performance
