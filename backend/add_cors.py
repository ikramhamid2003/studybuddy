with open('studybuddy/settings.py', 'r') as f:
    content = f.read()

lines = content.split('\n')
new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    # After line 38 (ALLOWED_HOSTS), add CORS_ALLOWED_ORIGINS
    if i == 37:  # after ALLOWED_HOSTS block
        new_lines.append('CORS_ALLOWED_ORIGINS = [\n    "https://studybuddy-omega-gray.vercel.app",\n    "http://localhost:3000",\n    "http://127.0.0.1:8000",\n]')

with open('studybuddy/settings.py', 'w') as f:
    f.write('\n'.join(new_lines))
print('CORS_ALLOWED_ORIGINS added')
"