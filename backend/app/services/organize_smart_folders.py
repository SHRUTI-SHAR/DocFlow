import os
import logging
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

def load_env():
    """Loads environment variables from backend/.env file and returns them as a dict."""
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    env_file_path = os.path.join(backend_dir, ".env")
    
    # Load .env file
    load_dotenv(env_file_path)
    
    env_vars = {
        "SUPABASE_URL": os.getenv("SUPABASE_URL"),
        "SUPABASE_SERVICE_ROLE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    }
    return env_vars

class OrganizeSmartFoldersService:
    def __init__(self):
        env_vars = load_env()
        if not env_vars["SUPABASE_URL"] or not env_vars["SUPABASE_SERVICE_ROLE_KEY"]:
            logger.warning("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env - OrganizeSmartFoldersService will be disabled")
            self.supabase = None
            return
        
        # Initialize Supabase client with error handling for version compatibility
        try:
            self.supabase: Client = create_client(
                env_vars["SUPABASE_URL"],
                env_vars["SUPABASE_SERVICE_ROLE_KEY"]
            )
            logger.info("✅ Supabase client initialized successfully for OrganizeSmartFoldersService")
        except TypeError as e:
            if "proxy" in str(e).lower():
                logger.error(f"Failed to initialize Supabase client: {e}")
                logger.error("This is likely a version compatibility issue between supabase-py and httpx/gotrue")
                logger.error("Try updating supabase-py: pip install --upgrade supabase")
                logger.warning("OrganizeSmartFoldersService will be disabled - smart folder organization features will not work")
                self.supabase = None
            else:
                raise
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            logger.warning("OrganizeSmartFoldersService will be disabled - smart folder organization features will not work")
            self.supabase = None

    async def organize_smart_folders(self, document_id: str) -> Dict[str, Any]:
        """Organize a document into smart folders."""
        if not self.supabase:
            raise RuntimeError("Supabase client not initialized. Smart folder organization is disabled.")
        
        try:
            logger.info(f"Processing document ID: {document_id}")
            
            # Get document details with insights
            document_response = self.supabase.from_('documents').select("""
                id,
                user_id,
                filename,
                file_type,
                extracted_text,
                created_at,
                metadata,
                document_insights (
                    importance_score,
                    key_topics,
                    document_type,
                    categories
                )
            """).eq('id', document_id).execute()
            
            if not document_response.data:
                raise Exception("Document not found")
            
            document = document_response.data[0]
            logger.info(f"Found document: {document['filename']}")
            
            # Format document with insights
            formatted_document = {
                **document,
                "insights": document.get('document_insights', [{}])[0] if document.get('document_insights') else {}
            }
            
            # Get all smart folders for this user
            folders_response = self.supabase.from_('smart_folders').select(
                'id, name, user_id, is_smart, ai_criteria'
            ).eq('user_id', document['user_id']).eq('is_smart', True).execute()
            
            if folders_response.error:
                logger.error(f"Error fetching smart folders: {folders_response.error}")
                raise Exception("Failed to fetch smart folders")
            
            smart_folders = folders_response.data
            logger.info(f"Found {len(smart_folders)} smart folders")
            
            organization_results = []
            
            if smart_folders:
                # Remove existing auto-assigned relationships for this document
                delete_response = self.supabase.from_('document_folder_relationships').delete().eq(
                    'document_id', document_id
                ).eq('is_auto_assigned', True).execute()
                
                if delete_response.error:
                    logger.warning(f"Error removing existing relationships: {delete_response.error}")
                
                for folder in smart_folders:
                    try:
                        match_result = self._matches_criteria(formatted_document, folder['ai_criteria'])
                        
                        logger.info(f"Folder \"{folder['name']}\": matches={match_result['matches']}, confidence={match_result['confidence']:.2f}")
                        
                        if match_result['matches']:
                            # Insert relationship
                            relationship_response = self.supabase.from_('document_folder_relationships').insert({
                                "document_id": document_id,
                                "folder_id": folder['id'],
                                "confidence_score": match_result['confidence'],
                                "is_auto_assigned": True
                            }).execute()
                            
                            if relationship_response.error:
                                logger.error(f"Error inserting relationship for folder {folder['name']}: {relationship_response.error}")
                            else:
                                # Update folder document count using RPC
                                try:
                                    self.supabase.rpc('increment', {
                                        "table_name": "smart_folders",
                                        "row_id": folder['id'],
                                        "column_name": "document_count"
                                    }).execute()
                                except Exception as e:
                                    logger.warning(f"Error updating folder count: {str(e)}")
                                
                                organization_results.append({
                                    "folderId": folder['id'],
                                    "folderName": folder['name'],
                                    "confidence": match_result['confidence'],
                                    "reasons": match_result['reasons']
                                })
                                
                                logger.info(f"✓ Added document to folder: {folder['name']} (confidence: {match_result['confidence'] * 100:.0f}%)")
                    except Exception as e:
                        logger.error(f"Error processing folder {folder['name']}: {str(e)}")
            
            logger.info(f"Organization complete. Added to {len(organization_results)} folders.")
            
            return {
                "success": True,
                "documentId": document_id,
                "organizationResults": organization_results,
                "message": f"Document organized into {len(organization_results)} smart folders"
            }
            
        except Exception as e:
            logger.error(f"Error in organize smart folders: {str(e)}")
            raise

    def _matches_criteria(self, document: Dict[str, Any], criteria: Dict[str, Any]) -> Dict[str, Any]:
        """Check if document matches smart folder criteria."""
        if not criteria:
            return {"matches": False, "confidence": 0, "reasons": []}
        
        total_score = 0
        max_score = 0
        reasons = []
        
        # Content Type Matching
        if criteria.get('content_type') and isinstance(criteria['content_type'], list):
            max_score += 30
            content_types = [t.lower() for t in criteria['content_type']]
            document_text = (document.get('extracted_text') or '').lower()
            file_name = (document.get('filename') or '').lower()
            document_type = (document.get('insights', {}).get('document_type') or '').lower()
            
            content_match = False
            for content_type in content_types:
                if (content_type in document_text or 
                    content_type in file_name or 
                    content_type in document_type):
                    content_match = True
                    reasons.append(f"Content type match: {content_type}")
                    break
            
            if content_match:
                total_score += 30
        
        # Importance Score Matching
        if criteria.get('importance_score') and criteria['importance_score'].get('min'):
            max_score += 25
            doc_importance = document.get('insights', {}).get('importance_score', 0)
            min_importance = criteria['importance_score']['min']
            
            if doc_importance >= min_importance:
                total_score += 25
                reasons.append(f"Importance score {doc_importance * 100:.0f}% >= {min_importance * 100:.0f}%")
        
        # Age/Recency Matching
        if criteria.get('created_at') and criteria['created_at'].get('days'):
            max_score += 20
            doc_date = document.get('created_at')
            if doc_date:
                from datetime import datetime
                doc_date_obj = datetime.fromisoformat(doc_date.replace('Z', '+00:00'))
                days_ago = (datetime.now(doc_date_obj.tzinfo) - doc_date_obj).days
                max_days = criteria['created_at']['days']
                
                if days_ago <= max_days:
                    total_score += 20
                    reasons.append(f"Created within last {max_days} days ({days_ago} days ago)")
        
        # Days Old Matching (alternative format)
        if criteria.get('days_old') and isinstance(criteria['days_old'], (int, float)):
            max_score += 20
            doc_date = document.get('created_at')
            if doc_date:
                from datetime import datetime
                doc_date_obj = datetime.fromisoformat(doc_date.replace('Z', '+00:00'))
                days_ago = (datetime.now(doc_date_obj.tzinfo) - doc_date_obj).days
                
                if days_ago <= criteria['days_old']:
                    total_score += 20
                    reasons.append(f"Created within last {criteria['days_old']} days ({days_ago} days ago)")
        
        # Keywords Matching
        if criteria.get('keywords') and isinstance(criteria['keywords'], list):
            max_score += 25
            document_text = (document.get('extracted_text') or '').lower()
            file_name = (document.get('filename') or '').lower()
            keyword_matches = 0
            
            for keyword in criteria['keywords']:
                keyword_lower = keyword.lower()
                if (keyword_lower in document_text or 
                    keyword_lower in file_name):
                    keyword_matches += 1
                    reasons.append(f"Keyword match: {keyword}")
            
            if keyword_matches > 0:
                keyword_score = min(25, (keyword_matches / len(criteria['keywords'])) * 25)
                total_score += keyword_score
        
        # Calculate confidence as percentage
        confidence = (total_score / max_score) if max_score > 0 else 0
        matches = confidence >= 0.3  # Require at least 30% match
        
        return {"matches": matches, "confidence": confidence, "reasons": reasons}