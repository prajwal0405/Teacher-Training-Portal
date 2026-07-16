import os

def fix_file(filepath):
    with open(filepath, 'rb') as f:
        raw_bytes = f.read()
    
    try:
        # Decode as utf-8 (which yields the mangled string)
        text = raw_bytes.decode('utf-8')
        
        if 'ðŸ' not in text and 'â' not in text:
            return

        # Encode the mangled string as windows-1252 to get the original bytes
        # Some characters might fail, so we ignore errors for the whole string,
        # but that could corrupt non-mangled stuff. Wait, it's safer to just do replacement
        # or use errors='ignore'. But actually, since the whole file was read as windows-1252 
        # and saved as utf-8, the whole string should be reversible.
        original_bytes = text.encode('windows-1252')
        fixed_text = original_bytes.decode('utf-8')
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fixed_text)
        print(f"Fixed {filepath}")
    except Exception as e:
        print(f"Skipping {filepath}: {e}")

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.jsx'):
            fix_file(os.path.join(root, file))
