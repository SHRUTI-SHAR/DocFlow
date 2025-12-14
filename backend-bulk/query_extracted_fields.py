"""
Query database to see all fields extracted by Gemini from BNI document
"""
from app.core.database import get_sync_db
from app.models.database import BulkJob, BulkJobDocument, BulkExtractedField
from sqlalchemy import desc

db = next(get_sync_db())

# Get latest BNI job
job = db.query(BulkJob).filter(
    BulkJob.name.like('%BNI%') | BulkJob.name.like('%bucket%') | BulkJob.name.like('%NEW%')
).order_by(desc(BulkJob.created_at)).first()

if not job:
    print("❌ No BNI job found!")
    exit(1)

print(f"✅ Found job: {job.name} (ID: {job.id})")
print(f"   Created: {job.created_at}")
print(f"   Status: {job.status}")
print(f"   Documents: {job.total_documents}")
print()

# Get first document
doc = db.query(BulkJobDocument).filter(
    BulkJobDocument.job_id == job.id
).first()

if not doc:
    print("❌ No documents in job!")
    exit(1)

print(f"📄 Document: {doc.filename}")
print(f"   Status: {doc.status}")
print()

# Get ALL extracted fields (what Gemini returned)
fields = db.query(BulkExtractedField).filter(
    BulkExtractedField.document_id == doc.id
).all()

print(f"📋 Total fields extracted: {len(fields)}")
print()

# Group by field_name to see what was extracted
extracted_fields = {}
for field in fields:
    field_name = field.field_name
    if field_name not in extracted_fields:
        extracted_fields[field_name] = {
            'value': field.field_value,
            'confidence': field.confidence_score,
            'section': field.section_name,
            'location': field.source_location
        }

print("="*100)
print("EXTRACTED FIELDS (What's in database)")
print("="*100)

for field_name in sorted(extracted_fields.keys())[:30]:  # Show first 30
    info = extracted_fields[field_name]
    value_preview = str(info['value'])[:80] if info['value'] else "(empty)"
    print(f"\n{field_name}:")
    print(f"  Value: {value_preview}")
    if info['section']:
        print(f"  Section: {info['section']}")
    if info['confidence']:
        print(f"  Confidence: {info['confidence']}")

# Now show CRITICAL fields we need to fix
print()
print("="*100)
print("CRITICAL FIELDS TO FIX")
print("="*100)

critical_mappings = {
    'Business Field': 'Pertambangan batu',
    'Business Group': 'PT Vitrama Indo Part',
    'Business Unit Details - Division': 'CMB2',
    'Business Unit Details - Unit': 'CMC Jatinegara',
    'UBO (Ultimate Beneficiary Owner) Name': 'Didi Sulistiono',
    'Deed of Establishment ID': '34',
    'Deed of Establishment Date': '22-05-1993',
    'Country of Incorporation': 'Indonesia',
    'State/Province of Organization': 'DKI Jakarta',
}

print("\nLooking for correct values in Gemini's output...\n")

for target_field, expected_value in critical_mappings.items():
    current_field = next((f for f in fields if f.field_name == target_field), None)
    
    print(f"❌ {target_field}:")
    print(f"   Expected: {expected_value}")
    if current_field:
        print(f"   Currently getting: {str(current_field.field_value)[:80]}")
    
    # Search for expected value in extracted fields
    matches = []
    for field_name, info in extracted_fields.items():
        if info['value'] and expected_value.lower() in str(info['value']).lower():
            matches.append((field_name, info['value']))
    
    if matches:
        print(f"   ✅ FOUND IN Field(s):")
        for fname, fval in matches[:3]:  # Show top 3 matches
            print(f"      → {fname}: {str(fval)[:100]}")
    else:
        print(f"   ⚠️  NOT FOUND in any extracted field")
    print()

db.close()
