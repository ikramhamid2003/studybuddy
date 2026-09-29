with open('studybuddy/settings.py', 'r') as f:
    content = f.read()

# Add TYPESAFE_API_KEY after OPENROUTER_API_KEY
old_line = 'OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")'
new_lines = '''OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
TYPESAFE_API_KEY = os.getenv("TYPESAFE_API_KEY", "")'''

if old_line in content:
    content = content.replace(old_line, new_lines)
    with open('studybuddy/settings.py', 'w') as f:
        f.write(content)
    print('Settings updated successfully')
else:
    print('Could not find OPENROUTER_API_KEY line')
    # Show what's around line 171
    lines = content.split('\n')
    for i in range(168, 175):
        if i < len(lines):
            print(f'{i}: {lines[i]}')