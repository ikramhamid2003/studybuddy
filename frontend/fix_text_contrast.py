with open('src/index.css', 'r') as f:
    content = f.read()
# Add fallback text color rule after the body opening brace
# Find the line with 'color: #0f172a;' and add the fallback after it
old_text = 'color: #0f172a;'
new_text = 'color: #0f172a; /* Fallback text color */\n    --fallback-text-color: #0f172a;'
if old_text in content:
    content = content.replace(old_text, new_text)
    with open('src/index.css', 'w') as f:
        f.write(content)
    print('Added fallback text color rule')
else:
    print('Could not find the target text color rule')
"