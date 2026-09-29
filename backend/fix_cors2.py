with open('studybuddy/settings.py', 'r') as f:
    lines = f.readlines()

# Insert CORS_ALLOWED_ORIGINS after line 40 (after ALLOWED_HOSTS block)
new_lines = lines[:41]  # keep lines up to line 40
cors_block = [
    'CORS_ALLOWED_ORIGINS = [\n',
    '    "https://studybuddy-omega-gray.vercel.app",\n',
    '    "http://localhost:3000",\n',
    '    "http://127.0.0.1:8000",\n',
    ']\n'
]
new_lines.extend(cors_block)
new_lines.extend(lines[41:])  # add the rest

with open('studybuddy/settings.py', 'w') as f:
    f.writelines(new_lines)
print('CORS_ALLOWED_ORIGINS added after ALLOWED_HOSTS')
"