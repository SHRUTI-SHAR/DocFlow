"""
Check BNI field mappings in database
"""
from app.core.database import get_sync_db
from app.models.database import FieldMapping, FieldMappingTemplate

db = next(get_sync_db())

# Get BNI template
template = db.query(FieldMappingTemplate).filter(
    FieldMappingTemplate.name.like('%BNI%')
).first()

if not template:
    print("❌ No BNI template found!")
    exit(1)

print(f"✅ Found template: {template.name} (ID: {template.id})")
print()

# Get all mappings
mappings = db.query(FieldMapping).filter(
    FieldMapping.template_id == template.id
).all()

print(f"📋 Total mappings: {len(mappings)}")
print()

# Show critical fields
critical_fields = [
    'Business Field',
    'Business Group', 
    'Business Unit Details - Division',
    'Business Unit Details - Unit',
    'UBO (Ultimate Beneficiary Owner) Name',
    'NPL',
    'AHU ID',
    'Deed of Establishment ID',
    'Deed of Establishment Date',
    'Country of Incorporation',
    'State/Province of Organization',
    'Application from debtor/Prospective Debtor',
    'Customer Since',
    'Debtor Since',
    'Default Currency',
    'NPWP',
    'Is Public company'
]

print("🔍 Critical Field Mappings:")
print("="*80)
for field_name in critical_fields:
    mapping = next((m for m in mappings if m.target_field_name == field_name), None)
    if mapping:
        print(f"\n{field_name}:")
        print(f"  Gemini Field: {mapping.gemini_field_name}")
        print(f"  Post-Process: {mapping.post_process_type or 'None'}")
        print(f"  Config: {mapping.post_process_config or 'None'}")
    else:
        print(f"\n{field_name}: ❌ NOT MAPPED")

db.close()
