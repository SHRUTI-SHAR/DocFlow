import pandas as pd

correct = pd.read_csv('BNI/CORRECT.csv')
extracted = pd.read_csv('BNI/NEW_JOB_export.csv')

print(f'Correct columns: {len(correct.columns)}')
print(f'Extracted columns: {len(extracted.columns)}')
print()

mismatches = []
for col in correct.columns:
    if col in extracted.columns:
        c_val = str(correct[col].iloc[0]) if pd.notna(correct[col].iloc[0]) else ''
        e_val = str(extracted[col].iloc[0]) if pd.notna(extracted[col].iloc[0]) else ''
        if c_val != e_val:
            mismatches.append((col, c_val, e_val))

print(f'Total mismatches: {len(mismatches)}')
print(f'Total fields: {len(correct.columns)}')
print(f'Accuracy: {((len(correct.columns) - len(mismatches)) / len(correct.columns) * 100):.1f}%')
print()

print('='*80)
print('MISMATCHES:')
print('='*80)
for i, (col, c, e) in enumerate(mismatches[:20], 1):
    print(f'\n{i}. Field: {col}')
    print(f'   ✓ Correct:   {c[:150]}')
    print(f'   ✗ Extracted: {e[:150]}')
