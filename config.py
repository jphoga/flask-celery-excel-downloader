import os
from os.path import join
from dotenv import load_dotenv

load_dotenv(verbose=True)
basedir = os.path.abspath(os.path.dirname(__file__))
dotenv_path = join(basedir, '.env')
load_dotenv(dotenv_path)

class Config(object):
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
    REDIS_URL = os.environ.get('REDIS_URL') or 'redis:\\'
    CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL')
    CELERY_RESULT_BACKEND = os.environ.get('CELERY_BROKER_URL')