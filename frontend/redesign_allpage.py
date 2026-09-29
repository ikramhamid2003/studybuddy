with open('src/pages/AllPage.jsx', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Replace the page header section with Google Notebook style
old_header = '''<div className="flex flex-1 flex-col min-h-0">
      <PageHeader
        icon="💬"
        title="Study Chat"
        subtitle="Ask anything — your AI tutor is ready to help"
      />'''

new_header = '''<div className="flex flex-1 flex-col min-h-0">
      <PageHeader
        icon="📓"
        title="StudyBuddy"
        subtitle="Your AI-powered study assistant"
      />'''

if old_header in content:
    content = content.replace(old_header, new_header)
    with open('src/pages/AllPage.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('AllPage header redesigned successfully')
else:
    print('Header pattern not found - showing first 200 chars')
    print(content[:300])