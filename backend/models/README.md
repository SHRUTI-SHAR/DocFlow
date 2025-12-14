# YOLO Models Directory

This directory should contain your trained YOLO model file for signature detection.

## Current Model

**`yolov8x.pt`** - This is a **base YOLOv8 model** trained on the COCO dataset (80 general object classes).

⚠️ **IMPORTANT:** This model is **NOT suitable for signature detection** because:
- It's trained on general objects (person, car, dog, etc.)
- Class 0 is "person", not "signature"
- It won't recognize signatures correctly

## What You Need

You need a model trained specifically for **signature detection**, not a general object detection model.

## Options

### Option 1: Rename and Use a Signature-Specific Model
If you have a signature detection model, rename it to:
```
signature_detector.pt
```

### Option 2: Configure to Use Current File
You can configure the system to use `yolov8x.pt` by setting in `.env`:
```env
YOLO_MODEL_PATH=models/yolov8x.pt
```

**Note:** This will NOT work for signature detection, but you can test if the system loads the model.

### Option 3: Get a Signature Detection Model
See `YOLO_MODEL_GUIDE.md` for instructions on:
- Downloading pre-trained signature detection models
- Training your own model
- Fine-tuning existing models

## Recommended Next Steps

1. **For Testing:** Keep `yolov8x.pt` but understand it won't detect signatures
2. **For Production:** Get a signature-specific model from:
   - Roboflow Universe (search "signature detection")
   - Train your own model
   - Fine-tune `yolov8x.pt` on signature data

## File Naming

The default model path is `models/signature_detector.pt`. You can either:
- Rename your model file to `signature_detector.pt`
- Or set `YOLO_MODEL_PATH` in `.env` to point to your model file

