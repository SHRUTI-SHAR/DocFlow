"""
Test YOLO model to check if it's suitable for signature detection
"""
import os
import sys
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

try:
    from ultralytics import YOLO
except ImportError:
    print("❌ ultralytics not installed. Install with: pip install ultralytics")
    sys.exit(1)

def test_model(model_path: str):
    """Test a YOLO model file"""
    print("=" * 60)
    print(f"Testing: {model_path}")
    print("=" * 60)
    
    if not os.path.exists(model_path):
        print(f"❌ File not found: {model_path}")
        return False
    
    try:
        # Load model
        model = YOLO(model_path)
        print(f"✅ Model loaded successfully")
        
        # Get model info
        num_classes = len(model.names) if hasattr(model, 'names') else 0
        print(f"📊 Number of classes: {num_classes}")
        
        # Check class 0
        class_0_name = model.names.get(0, "unknown") if hasattr(model, 'names') else "unknown"
        print(f"📋 Class 0: '{class_0_name}'")
        
        # Check for signature-related classes
        signature_classes = []
        for class_id, class_name in model.names.items():
            if 'signature' in class_name.lower() or 'sig' in class_name.lower():
                signature_classes.append((class_id, class_name))
        
        if signature_classes:
            print(f"✅ Found signature-related classes:")
            for class_id, class_name in signature_classes:
                print(f"   - Class {class_id}: '{class_name}'")
        else:
            print(f"⚠️  No signature-related classes found")
        
        # Show first 10 classes
        print(f"\n📋 First 10 classes:")
        for i in range(min(10, num_classes)):
            print(f"   Class {i}: '{model.names[i]}'")
        
        # Determine if suitable for signature detection
        print(f"\n{'='*60}")
        is_suitable = False
        
        if num_classes == 80 and class_0_name.lower() == "person":
            print("❌ This is a COCO base model (general object detection)")
            print("   NOT suitable for signature detection")
            print("   Class 0 is 'person', not 'signature'")
        elif signature_classes:
            print("✅ This model appears to be trained for signature detection!")
            print("   Suitable for use in this system")
            is_suitable = True
        elif class_0_name.lower() in ["signature", "sig"]:
            print("✅ Class 0 is a signature class")
            print("   Likely suitable for signature detection")
            is_suitable = True
        else:
            print("⚠️  Cannot determine if this is a signature detection model")
            print("   May not work correctly for signature detection")
            print("   Consider testing with actual signature images")
        
        print("=" * 60)
        return is_suitable
        
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    models_dir = Path("models")
    
    # Find all .pt files
    pt_files = list(models_dir.glob("*.pt"))
    
    if not pt_files:
        print("❌ No .pt model files found in models/ directory")
        print("💡 Place your YOLO model file (.pt) in the models/ directory")
        sys.exit(1)
    
    print(f"Found {len(pt_files)} model file(s):\n")
    
    suitable_models = []
    for model_file in pt_files:
        is_suitable = test_model(str(model_file))
        if is_suitable:
            suitable_models.append(model_file)
        print()
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if suitable_models:
        print(f"✅ Found {len(suitable_models)} suitable model(s) for signature detection:")
        for model in suitable_models:
            print(f"   - {model.name}")
        print(f"\n💡 To use: Set YOLO_MODEL_PATH=models/{suitable_models[0].name} in .env")
    else:
        print("⚠️  No suitable signature detection models found")
        print("💡 You need a model trained specifically for signature detection")
        print("💡 See YOLO_MODEL_GUIDE.md for instructions")
    
    print("=" * 60)

