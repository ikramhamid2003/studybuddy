with open('studybuddy/settings.py', 'r') as f:
    content = f.read()

# Add CORS configuration after ALLOWED_HOSTS line
old_line = 'ALLOWED_HOSTS = studybuddy-api-hkgx.onrender.com'
new_lines = '''ALLOWED_HOSTS = ["studybuddy-api-hkgx.onrender.com"]\nCORS_ALLOWED_ORIGINS = [
    "https://studybuddy-omega-gray.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:8000",
]'''

if old_line in content:
    content = content.replace(old_line, new_lines)
    with open('studybuddy/settings.py', 'w') as f:
        f.write(content)
    print('CORS configuration added successfully')
else:
    print('Could not find ALLOWED_HOSTS line')
    lines = content.split('\n')
    for i in range(10, 15):
        if i < len(lines):
            print(f'{i}: {lines[i]}')