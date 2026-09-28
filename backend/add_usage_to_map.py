with open('study_api/dispatchers.py', 'r') as f:
    content = f.read()

# Add usage_stats to ACTION_MAP
old_map_entry = '    "health": lambda _data, _request=None: _ok({"status": "ok"}),'
new_map_entry = '''    "health": lambda _data, _request=None: _ok({"status": "ok"}),
    "usage_stats": _action_usage_stats,'''

if old_map_entry in content:
    content = content.replace(old_map_entry, new_map_entry)
    with open('study_api/dispatchers.py', 'w') as f:
        f.write(content)
    print('ACTION_MAP updated successfully')
else:
    print('Could not find ACTION_MAP entry')
    # Debug: show what's around health
    idx = content.find('"health"')
    if idx >= 0:
        print(f'Found "health" at {idx}: {content[idx:idx+80]}')