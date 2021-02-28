## How to setup the report downloader app:

1) Clone project and set up virtual environment
$ python3 -m venv venv
and activate it.

1.1) Run 
$ pip install -r requirements.txt

2) Add a .env file (should be stored in the server) with below information:
FLASK_APP=report_downloader.py
SECRET_KEY=<create secret key>
CELERY_BROKER_URL='redis://localhost:6379/0'
CELERY_RESULT_BACKEND='redis://localhost:6379/0'

3) Add environment variables
echo "export FLASK_APP=report_downloader.py" >> ~/.bashrc
export FLASK_APP=report_downloader.py
export FLASK_ENV=production

### 3) Add folder "certs" to root of app and create self-signed certificates:
### $ openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365

4) Add gunicorn and set up service to start app
(venv) $ pip install gunicorn
$ gunicorn -b localhost:8000 -w 4 <module-name>:<app-name>
# Add service for gunicorn
[Unit]
Description=Report Downloader
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
WorkingDirectory=/home/ec2-user/maruchan-report-downloader-app/
RestartSec=1
ExecStart=/home/ec2-user/maruchan-report-downloader-app/venv/bin/gunicorn -b localhost:8000 -w 4 report_downloader:report_downloader

[Install]
WantedBy=multi-user.target

# Start service 
# Enable service for restart

5) Add nginx to reach app via HTTPS
https://blog.miguelgrinberg.com/post/running-your-flask-application-over-https

6) Install and start redis.server via service
https://shawn-shi.medium.com/how-to-install-redis-on-ec2-server-for-fast-in-memory-database-f30c3ef8c35e
# Run below commands:
sudo yum -y install gcc make # install GCC compiler
cd /usr/local/src 
sudo wget http://download.redis.io/redis-stable.tar.gz
sudo tar xvzf redis-stable.tar.gz
sudo rm -f redis-stable.tar.gz
cd redis-stable
sudo yum groupinstall "Development Tools"
sudo make distclean
sudo make
sudo yum install -y tcl
sudo make test
sudo cp src/redis-server /usr/local/bin/
sudo cp src/redis-cli /usr/local/bin/

# Add redis.service:
[Unit]
Description=Redis
After=syslog.target

[Service]
ExecStart=/usr/local/bin/redis-server /usr/local/src/redis-stable/redis.conf
RestartSec=5s
Restart=on-success

[Install]
WantedBy=multi-user.target

7) Start a celery worker by following command:

for Windows (eventlet is needed):
    celery -A celery-worker.celery worker --loglevel=INFO -P eventlet
for Linux:
    celery -A celery-worker.celery worker --loglevel=INFO

# Add report-downloader-celery-worker.service:
[Unit]
Description=Report Downloader
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
WorkingDirectory=/home/ec2-user/maruchan-report-downloader-app/
RestartSec=1
ExecStart=/home/ec2-user/maruchan-report-downloader-app/venv/bin/celery -A celery-worker.celery worker --loglevel=INFO

[Install]
WantedBy=multi-user.target

Change INFO to DEBUG in case you want a detailed output log.
