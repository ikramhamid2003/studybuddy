import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'studybuddy.settings'

import django
django.setup()

from study_api.dispatchers import ACTION_MAP
print('usage_stats' in ACTION_MAP)
print('Available actions:', list(ACTION_MAP.keys()))