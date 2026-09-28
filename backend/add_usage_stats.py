with open('study_api/dispatchers.py', 'r') as f:
    content = f.read()

# Add usage_stats handler after _action_refresh handler completion marker
handler_code = '''

def _action_usage_stats(data, request):
    \"\"\"Return cumulative token usage and estimated cost for the authenticated user.\"\"\"
    generations = Generation.objects.filter(user=request.user)
    total_input = sum(g.input_tokens or 0 for g in generations)
    total_output = sum(g.output_tokens or 0 for g in generations)
    total_cost = sum(g.cost or 0 for g in generations)

    # Also include UsageLog entries if they exist
    try:
        from .models import UsageLog
        usage_logs = UsageLog.objects.filter(user=request.user)
        total_input += sum(ul.input_tokens or 0 for ul in usage_logs)
        total_output += sum(ul.output_tokens or 0 for ul in usage_logs)
        total_cost += sum(ul.estimated_cost or 0 for ul in usage_logs)
    except Exception:
        pass

    return _ok({
        \"total_input_tokens\": total_input,
        \"total_output_tokens\": total_output,
        \"total_estimated_cost\": round(total_cost, 4),
    })


'''

# Insert after _action_refresh handler's return statement
insert_marker = '    return _ok(_unwrap(serializer.validated_data))'
if insert_marker in content:
    content = content.replace(insert_marker, insert_marker + handler_code, 1)
    with open('study_api/dispatchers.py', 'w') as f:
        f.write(content)
    print('Handler code added successfully')
else:
    print('Could not find insert marker - checking file...')
    # Try to find where _action_refresh ends
    idx = content.find('return _ok(_unwrap(serializer.validated_data))')
    if idx >= 0:
        print(f'Found marker at index {idx}')