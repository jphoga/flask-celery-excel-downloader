#!/usr/bin/env python
import os
from app import celery, create_app

app = create_app(os.getenv('FLASK_CONFIG'))
app.app_context().push()
