"""
Unit tests for source adapters
"""

import sys
import os
import tempfile
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from app.services.source_adapter import (
    SourceAdapter,
    FolderSourceAdapter,
    DatabaseSourceAdapter,
    CloudSourceAdapter,
    SourceAdapterFactory,
    DocumentInfo
)


class TestFolderSourceAdapter:
    """Tests for FolderSourceAdapter"""
    
    def test_validate_source_valid(self):
        """Test validation with valid folder path"""
        adapter = FolderSourceAdapter()
        
        # Create temporary directory
        with tempfile.TemporaryDirectory() as tmpdir:
            config = {"path": tmpdir}
            assert adapter.validate_source(config) is True
    
    def test_validate_source_invalid(self):
        """Test validation with invalid folder path"""
        adapter = FolderSourceAdapter()
        
        config = {"path": "/nonexistent/path/12345"}
        assert adapter.validate_source(config) is False
    
    def test_validate_source_missing_path(self):
        """Test validation with missing path"""
        adapter = FolderSourceAdapter()
        
        config = {}
        assert adapter.validate_source(config) is False
    
    def test_discover_documents(self):
        """Test document discovery"""
        adapter = FolderSourceAdapter()
        
        # Create temporary directory with test files
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create test files
            test_files = [
                "test1.pdf",
                "test2.jpg",
                "test3.png",
                "test4.txt"  # Should be filtered out
            ]
            
            for filename in test_files:
                filepath = Path(tmpdir) / filename
                filepath.write_text("test content")
            
            config = {
                "path": tmpdir,
                "file_types": ["pdf", "jpg", "png"],
                "recursive": False
            }
            
            documents = adapter.discover_documents(config, batch_size=10)
            
            # Should find 3 files (pdf, jpg, png)
            assert len(documents) == 3
            assert all(doc.filename in ["test1.pdf", "test2.jpg", "test3.png"] for doc in documents)
    
    def test_discover_documents_recursive(self):
        """Test recursive document discovery"""
        adapter = FolderSourceAdapter()
        
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create subdirectory
            subdir = Path(tmpdir) / "subdir"
            subdir.mkdir()
            
            # Create files in root and subdirectory
            (Path(tmpdir) / "root.pdf").write_text("test")
            (subdir / "sub.pdf").write_text("test")
            
            config = {
                "path": tmpdir,
                "file_types": ["pdf"],
                "recursive": True
            }
            
            documents = adapter.discover_documents(config, batch_size=10)
            assert len(documents) == 2
    
    def test_get_document_content(self):
        """Test getting document content"""
        adapter = FolderSourceAdapter()
        
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / "test.pdf"
            test_content = b"test pdf content"
            test_file.write_bytes(test_content)
            
            content = adapter.get_document_content(str(test_file))
            assert content == test_content


class TestSourceAdapterFactory:
    """Tests for SourceAdapterFactory"""
    
    def test_create_folder_adapter(self):
        """Test creating folder adapter"""
        adapter = SourceAdapterFactory.create("folder")
        assert isinstance(adapter, FolderSourceAdapter)
    
    def test_create_database_adapter(self):
        """Test creating database adapter"""
        adapter = SourceAdapterFactory.create("database")
        assert isinstance(adapter, DatabaseSourceAdapter)
    
    def test_create_cloud_adapter(self):
        """Test creating cloud adapter"""
        adapter = SourceAdapterFactory.create("cloud")
        assert isinstance(adapter, CloudSourceAdapter)
    
    def test_create_invalid_adapter(self):
        """Test creating invalid adapter type"""
        with pytest.raises(ValueError):
            SourceAdapterFactory.create("invalid_type")
    
    def test_create_case_insensitive(self):
        """Test that adapter creation is case insensitive"""
        adapter1 = SourceAdapterFactory.create("FOLDER")
        adapter2 = SourceAdapterFactory.create("folder")
        assert type(adapter1) == type(adapter2)


class TestDatabaseSourceAdapter:
    """Tests for DatabaseSourceAdapter"""
    
    def test_validate_source_with_query(self):
        """Test validation with query"""
        adapter = DatabaseSourceAdapter()
        
        config = {"query": "SELECT * FROM documents"}
        assert adapter.validate_source(config) is True
    
    def test_validate_source_without_query(self):
        """Test validation without query"""
        adapter = DatabaseSourceAdapter()
        
        config = {}
        assert adapter.validate_source(config) is False


class TestCloudSourceAdapter:
    """Tests for CloudSourceAdapter"""
    
    def test_validate_source_with_bucket(self):
        """Test validation with bucket"""
        adapter = CloudSourceAdapter()
        
        config = {"bucket": "my-bucket"}
        assert adapter.validate_source(config) is True
    
    def test_validate_source_without_bucket(self):
        """Test validation without bucket"""
        adapter = CloudSourceAdapter()
        
        config = {}
        assert adapter.validate_source(config) is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

