with open('backend/study_api/models.py', 'r') as f:
    lines = f.readlines()

# Find the line with Generation.__str__ and add UsageLog after it
insert_idx = None
for i, line in enumerate(lines):
    if 'return f"{self.type}: {self.topic[:40]}"' in line:
        insert_idx = i + 1
        break

if insert_idx:
    # Add UsageLog model after Generation.__str__
    usage_log_lines = [
        '\n',
        'class UsageLog(models.Model):',
        '    """Track per-user token usage and estimated cost."""',
        '    user = models.ForeignKey(',
        '        settings.AUTH_USER_MODEL,',
        '        on_delete=models.CASCADE,',
        '        related_name="usage_logs",',
        '    )',
        '    generation = models.ForeignKey(',
        '        Generation,',
        '        on_delete=models.CASCADE,',
        '        null=True,',
        '        blank=True,',
        '        related_name="usage_logs",',
        '    )',
        '    input_tokens = models.IntegerField(default=0)',
        '    output_tokens = models.IntegerField(default=0)',
        '    estimated_cost = models.DecimalField(max_digits=10, decimal_places=4, default=0)',
        '    created_at = models.DateTimeField(auto_now_add=True)',
        '    class Meta:',
        '        ordering = ["-created_at"]',
        '    def __str__(self):',
        '        return f"{self.user.username} - {self.input_tokens} in / {self.output_tokens} out @ {self.estimated_cost}"',
    ]
    lines.insert(insert_idx, '\n')
    for ul in usage_log_lines:
        lines.insert(insert_idx + 1, ul)
        insert_idx += 1
    
    with open('backend/study_api/models.py', 'w') as f:
        f.writelines(lines)
    print('UsageLog model added successfully at line', insert_idx)
else:
    print('Could not find Generation.__str__ line')