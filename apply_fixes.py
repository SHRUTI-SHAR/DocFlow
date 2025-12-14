"""
Apply post-processing fixes to exported CSV
"""
import pandas as pd
import re

def apply_fixes(df):
    """Apply all post-processing fixes"""
    
    # 1. Date format: DD-MM-YYYY → DD/MM/YYYY
    date_fields = ['Customer Since', 'Debtor Since', 'Deed of Establishment Date', 
                   'Latest Amendment Deed Date', 'Date Of Birth', 'Date of Issue',
                   'Total Assets Date', 'Last Review', 'Next Review']
    
    for field in date_fields:
        if field in df.columns:
            df[field] = df[field].astype(str).str.replace('-', '/', regex=False)
            df[field] = df[field].replace('nan', '')
    
    # 2. Boolean: Y/N → Yes/No
    boolean_fields = ['Is the portfolio condition need Ijin Prinsip', 'NPL', 
                      'Is Public company', 'Prohibited Industry', 'High Risk Industry',
                      'Prior Business Bankruptcy', 'Is Primary Contact']
    
    for field in boolean_fields:
        if field in df.columns:
            df[field] = df[field].astype(str).replace({
                'Y': 'Yes', 'N': 'No', 'y': 'Yes', 'n': 'No',
                'nan': 'No', '-': 'No'
            })
    
    # 3. Strip currency units
    currency_fields = ['Default Currency', 'Sales Currency', 'Assets Currency']
    
    for field in currency_fields:
        if field in df.columns:
            df[field] = df[field].astype(str).str.replace(' Jutaan', '', regex=False)
            df[field] = df[field].str.replace(' Juta', '', regex=False)
            df[field] = df[field].str.replace('Jutaan', '', regex=False)
            df[field] = df[field].replace('nan', '')
    
    # 4. Normalize NPWP
    if 'NPWP' in df.columns:
        def normalize_npwp(val):
            if pd.isna(val) or val == '-':
                return ''
            val_str = str(val).replace('-', '').replace('.', '').strip()
            if val_str and val_str.isdigit():
                return f"{val_str}.0"
            return val_str
        
        df['NPWP'] = df['NPWP'].apply(normalize_npwp)
    
    # 5. Handle empty dash
    if 'Remarks' in df.columns:
        df['Remarks'] = df['Remarks'].replace('-', '')
        df['Remarks'] = df['Remarks'].replace('nan', '')
    
    # 6. Extract reference number
    if 'Application from debtor/Prospective Debtor' in df.columns:
        def extract_ref(val):
            if pd.isna(val):
                return ''
            val_str = str(val)
            match = re.search(r'Surat No\.\s*[\w\d/\-]+', val_str, re.IGNORECASE)
            if match:
                return match.group(0)
            return val_str
        
        df['Application from debtor/Prospective Debtor'] = df['Application from debtor/Prospective Debtor'].apply(extract_ref)
    
    return df

# Load and fix
df = pd.read_csv('BNI/NEW_JOB_export.csv')
df_fixed = apply_fixes(df)
df_fixed.to_csv('BNI/NEW_JOB_export_FIXED.csv', index=False)

print("✅ Applied post-processing fixes")
print(f"   Saved to: BNI/NEW_JOB_export_FIXED.csv")

# Compare with correct
correct = pd.read_csv('BNI/CORRECT.csv')

format_fixed = []
still_wrong = []

for col in correct.columns:
    if col in df.columns:
        c_val = str(correct[col].iloc[0]) if pd.notna(correct[col].iloc[0]) else ''
        e_val_before = str(df[col].iloc[0]) if pd.notna(df[col].iloc[0]) else ''
        e_val_after = str(df_fixed[col].iloc[0]) if pd.notna(df_fixed[col].iloc[0]) else ''
        
        # Was wrong before, now correct
        if c_val != e_val_before and c_val == e_val_after:
            format_fixed.append(col)
        # Still wrong
        elif c_val != e_val_after:
            still_wrong.append((col, c_val[:50], e_val_after[:50]))

print(f"\n📊 Results:")
print(f"   ✅ FORMAT ISSUES FIXED: {len(format_fixed)} fields")
for field in format_fixed:
    print(f"      - {field}")

print(f"\n   ⚠️  STILL WRONG (Need Mapping Fix): {len(still_wrong)} fields")
for field, correct_val, wrong_val in still_wrong[:10]:
    print(f"      - {field}")
    print(f"        Expected: {correct_val}")
    print(f"        Got: {wrong_val}")
