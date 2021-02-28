# How to setup the report downloader app

## Clone project and move into the project root folder
Set up a virtual environment and activate it.
	
	$ python3 -m venv venv
	$ source venv/bin/activate


## Install all requirements.

	$ pip install -r requirements.txt

## Create a .env file (this should not be commited)
	
	$ touch .env
	$ vim .env

and enter below information:
	
	FLASK_APP=report_downloader.py
	SECRET_KEY=<create secret key>
	CELERY_BROKER_URL='redis://localhost:6379/0'
	CELERY_RESULT_BACKEND='redis://localhost:6379/0'

## Add environment variables to linux

	$ echo "export FLASK_APP=report_downloader.py" >> ~/.bashrc
	$ export FLASK_APP=report_downloader.py
	$ export FLASK_ENV=production

## Add a folder "certs" to root of app and create self-signed certificates.
	 $ mkdir certs
	 $ cd certs

	 $ openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365

## Add gunicorn and set up service to start app.

	(venv) $ pip install gunicorn
	(venv) $ gunicorn -b localhost:8000 -w 4 <module-name>:<app-name>

## Add below "excelreport.service" file to /etc/systemd/system/ folder (advanced)
	[Unit]
	Description=Report Downloader
	After=network.target
	StartLimitIntervalSec=0

	[Service]
	Type=simple
	Restart=always
	WorkingDirectory=/home/ec2-user/maruchan-report-downloader-app/
	RestartSec=1
	ExecStart=/home/ec2-user/maruchan-report-downloader-app/venv/bin/gunicorn -b  
	localhost:8000 -w 4 report_downloader:report_downloader

	[Install]
	WantedBy=multi-user.target

## Enable, start and check status of service
	$ sudo systemctl enable excelreport.service
	$ sudo systemctl start excelreport.service
	$ sudo systemctl status excelreport.service


## Add nginx to reach app via HTTPS
### Check below awesome blog-post from Miguel Grinberg for a how-to:
https://blog.miguelgrinberg.com/post/running-your-flask-application-over-https

## Install and start redis.server via service 
### Check below in-detail article of how to set up redis-server on an AWS ec2-instance:
https://shawn-shi.medium.com/how-to-install-redis-on-ec2-server-for-fast-in-memory-database-f30c3ef8c35e

### In short run below commands:
	$ sudo yum -y install gcc make # install GCC compiler
	$ cd /usr/local/src
	$ sudo wget http://download.redis.io/redis-stable.tar.gz
	$ sudo tar xvzf redis-stable.tar.gz
	$ sudo rm -f redis-stable.tar.gz
	$ cd redis-stable
	$ sudo yum groupinstall "Development Tools"
	$ sudo make distclean
	$ sudo make
	$ sudo yum install -y tcl
	$ sudo make test
	$ sudo cp src/redis-server /usr/local/bin/
	$ sudo cp src/redis-cli /usr/local/bin/

## And add a redis.service file to /etc/systemd/system/
	[Unit]
	Description=Redis
	After=syslog.target

	[Service]
	ExecStart=/usr/local/bin/redis-server /usr/local/src/redis-stable/redis.conf
	RestartSec=5s
	Restart=on-success

	[Install]
	WantedBy=multi-user.target

## Start a celery worker by following command

### for Windows (eventlet is needed):
    celery -A celery-worker.celery worker --loglevel=INFO -P eventlet
	
### for Linux:
    celery -A celery-worker.celery worker --loglevel=INFO

## Add report-downloader-celery-worker.service:
	[Unit]
	Description=Report Downloader
	After=network.target
	StartLimitIntervalSec=0

	[Service]
	Type=simple
	Restart=always
	WorkingDirectory=/home/ec2-user/maruchan-report-downloader-app/
	RestartSec=1
	ExecStart=/home/ec2-user/maruchan-report-downloader-app/venv/bin/celery -A 
	celery-worker.celery worker --loglevel=INFO

	[Install]
	WantedBy=multi-user.target

Change INFO to DEBUG in case you want a detailed output log.

### Happy downloading!

