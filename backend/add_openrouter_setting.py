with open('studybuddy/settings.py', 'r') as f:
    content = f.read()

# Add OPENROUTER_API_KEY after GROQ_API_KEY
old_line = 'GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")'
new_lines = '''GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")'''

if old_line in content:
    content = content.replace(old_line, new_lines)
    with open('studybuddy/settings.py', 'w') as f:
        f.write(content)
    print('Settings updated successfully')
else:
    print('Could not find GROQ_API_KEY line')
    # Show what's around line 171
    lines = content.split('\n')
    for i in range(168, 175):
        if i < len(lines):
            print(f'{i}: {lines[i]}')