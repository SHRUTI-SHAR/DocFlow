#!/usr/bin/env python3
"""
Command-line RAG (Retrieval-Augmented Generation) tool for DocFlow
Usage: python semantic_search_cli.py "your question" [options]
"""

import os
import sys
import asyncio
import argparse
from datetime import datetime
from dotenv import load_dotenv

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(__file__))

def setup_environment():
    """Load environment variables."""
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

async def ask_question(query: str, user_id: str, max_docs: int = 3, threshold: float = 0.3):
    """Ask a question using RAG (Retrieval-Augmented Generation)."""
    try:
        from app.services.modules.rag_service import RAGService
        
        print(f"🤖 RAG Question: '{query}'")
        print(f"👤 User ID: {user_id}")
        print(f"📊 Max Documents: {max_docs}, Threshold: {threshold}")
        print("-" * 60)
        
        # Initialize RAG service
        rag_service = RAGService()
        
        # Ask question using RAG
        result = await rag_service.ask_question(
            question=query,
            user_id=user_id,
            max_documents=max_docs,
            similarity_threshold=threshold,
            include_sources=True
        )
        
        # Display answer
        print(f"🧠 AI Answer:")
        print(f"{result.get('answer', 'No answer generated')}")
        print()
        
        # Display confidence
        confidence = result.get('confidence', 0.0)
        print(f"📊 Confidence: {confidence:.1%}")
        print()
        
        # Display sources
        sources = result.get('sources', [])
        if sources:
            print(f"📚 Sources ({len(sources)} documents):")
            for i, source in enumerate(sources, 1):
                filename = source.get('file_name', 'Unknown')
                score = source.get('similarity_score', 0.0)
                print(f"  {i}. {filename} (Relevance: {score:.3f})")
            print()
        
        # Display metadata
        metadata = result.get('metadata', {})
        if metadata:
            print(f"ℹ️  Metadata:")
            print(f"   Documents Retrieved: {metadata.get('documents_retrieved', 0)}")
            print(f"   Context Length: {metadata.get('context_length', 0)} characters")
            print(f"   Model Used: {metadata.get('model_used', 'Unknown')}")
        
        return result
        
    except Exception as e:
        print(f"❌ Error asking question: {e}")
        import traceback
        traceback.print_exc()
        return None

async def summarize_document(document_id: str, user_id: str, summary_type: str = "brief"):
    """Generate a summary of a specific document."""
    try:
        from app.services.modules.rag_service import RAGService
        
        print(f"📄 Generating {summary_type} summary for document: {document_id}")
        print(f"👤 User ID: {user_id}")
        print("-" * 60)
        
        # Initialize RAG service
        rag_service = RAGService()
        
        # Generate summary
        result = await rag_service.get_document_summary(
            document_id=document_id,
            user_id=user_id,
            summary_type=summary_type
        )
        
        # Display summary
        print(f"📝 Summary:")
        print(f"{result.get('summary', 'No summary generated')}")
        print()
        
        # Display metadata
        metadata = result.get('metadata', {})
        if metadata:
            print(f"ℹ️  Metadata:")
            print(f"   Document ID: {metadata.get('document_id', 'Unknown')}")
            print(f"   File Name: {metadata.get('file_name', 'Unknown')}")
            print(f"   Summary Type: {metadata.get('summary_type', 'Unknown')}")
            print(f"   Model Used: {metadata.get('model_used', 'Unknown')}")
        
        return result
        
    except Exception as e:
        print(f"❌ Error generating summary: {e}")
        import traceback
        traceback.print_exc()
        return None

async def find_similar_documents(document_id: str, user_id: str, limit: int = 5, threshold: float = 0.6):
    """Find documents similar to a given document."""
    try:
        from app.services.modules.semantic_search_service import SemanticSearchService
        
        print(f"🔍 Finding documents similar to: {document_id}")
        print(f"👤 User ID: {user_id}")
        print(f"📊 Limit: {limit}, Threshold: {threshold}")
        print("-" * 60)
        
        # Initialize service
        search_service = SemanticSearchService()
        
        # Find similar documents
        results = await search_service.find_similar_documents(
            document_id=document_id,
            user_id=user_id,
            limit=limit,
            similarity_threshold=threshold
        )
        
        if results and results.get('results'):
            print(f"✅ Found {len(results['results'])} similar documents:")
            print()
            
            for i, doc in enumerate(results['results'], 1):
                score = doc.get('similarity_score', 0)
                filename = doc.get('file_name', 'Unknown')
                file_type = doc.get('file_type', 'Unknown')
                created_at = doc.get('created_at', 'Unknown')
                
                print(f"{i}. 📄 {filename}")
                print(f"   📊 Similarity Score: {score:.3f}")
                print(f"   📁 Type: {file_type}")
                print(f"   📅 Created: {created_at}")
                print()
        else:
            print("❌ No similar documents found")
            print("💡 Try:")
            print("   - Lowering the similarity threshold (--threshold)")
            print("   - Checking if the document ID exists")
        
        return results
        
    except Exception as e:
        print(f"❌ Error finding similar documents: {e}")
        import traceback
        traceback.print_exc()
        return None

def list_documents(user_id: str, limit: int = 10):
    """List documents for a user."""
    try:
        from supabase import create_client
        
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_key:
            print("❌ Supabase credentials not found")
            return
        
        supabase = create_client(supabase_url, supabase_key)
        
        print(f"📋 Listing documents for user: {user_id}")
        print(f"📊 Limit: {limit}")
        print("-" * 60)
        
        response = supabase.table("documents").select(
            "id, file_name, file_type, created_at, processing_status, vector_embedding"
        ).eq("user_id", user_id).limit(limit).execute()
        
        if response.data:
            print(f"✅ Found {len(response.data)} documents:")
            print()
            
            for i, doc in enumerate(response.data, 1):
                doc_id = doc.get('id', 'Unknown')
                filename = doc.get('file_name', 'Unknown')
                file_type = doc.get('file_type', 'Unknown')
                created_at = doc.get('created_at', 'Unknown')
                status = doc.get('processing_status', 'Unknown')
                has_embedding = doc.get('vector_embedding') is not None
                
                print(f"{i}. 📄 {filename}")
                print(f"   🆔 ID: {doc_id}")
                print(f"   📁 Type: {file_type}")
                print(f"   📅 Created: {created_at}")
                print(f"   ⚙️  Status: {status}")
                print(f"   🔍 Has Embedding: {'✅' if has_embedding else '❌'}")
                print()
        else:
            print("❌ No documents found for this user")
        
    except Exception as e:
        print(f"❌ Error listing documents: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Main CLI function."""
    parser = argparse.ArgumentParser(
        description="DocFlow RAG (Retrieval-Augmented Generation) CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Ask questions using RAG
  python semantic_search_cli.py "What is the registration number of ARUN KUMAR's vehicle?" --user-id 9b2a2938-f5d6-4ce7-bf4f-085568820389
  
  # Ask with custom parameters
  python semantic_search_cli.py "Tell me about the insurance details" --max-docs 5 --threshold 0.5 --user-id 9b2a2938-f5d6-4ce7-bf4f-085568820389
  
  # Generate document summary
  python semantic_search_cli.py --summarize a4494955-7131-495c-975c-2e7e9b7962f3 --user-id 9b2a2938-f5d6-4ce7-bf4f-085568820389
  
  # List documents
  python semantic_search_cli.py --list-docs --user-id 9b2a2938-f5d6-4ce7-bf4f-085568820389
  
  # Find similar documents
  python semantic_search_cli.py --similar-to a4494955-7131-495c-975c-2e7e9b7962f3 --user-id 9b2a2938-f5d6-4ce7-bf4f-085568820389
        """
    )
    
    # Main command
    parser.add_argument('query', nargs='?', help='Question to ask using RAG')
    
    # Options
    parser.add_argument('--user-id', required=True, help='User ID for the search')
    parser.add_argument('--max-docs', type=int, default=3, help='Maximum number of documents to retrieve (default: 3)')
    parser.add_argument('--threshold', type=float, default=0.3, help='Similarity threshold (default: 0.3)')
    
    # Alternative commands
    parser.add_argument('--list-docs', action='store_true', help='List documents for the user')
    parser.add_argument('--similar-to', help='Find documents similar to the given document ID')
    parser.add_argument('--summarize', help='Generate summary of the given document ID')
    parser.add_argument('--summary-type', choices=['brief', 'detailed', 'key_points'], default='brief', help='Type of summary to generate')
    
    args = parser.parse_args()
    
    # Setup environment
    setup_environment()
    
    print("🚀 DocFlow RAG (Retrieval-Augmented Generation) CLI")
    print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    if args.list_docs:
        # List documents
        list_documents(args.user_id, args.max_docs)
    elif args.similar_to:
        # Find similar documents
        asyncio.run(find_similar_documents(args.similar_to, args.user_id, args.max_docs, args.threshold))
    elif args.summarize:
        # Generate document summary
        asyncio.run(summarize_document(args.summarize, args.user_id, args.summary_type))
    elif args.query:
        # Ask question using RAG
        asyncio.run(ask_question(args.query, args.user_id, args.max_docs, args.threshold))
    else:
        print("❌ Please provide a question or use --list-docs, --similar-to, or --summarize")
        parser.print_help()

if __name__ == "__main__":
    main()
