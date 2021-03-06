![download-screen](https://github.com/jphoga/flask-celery-excel-downloader/blob/main/download-long-report.gif?raw=true)


# Flask app to download excel with progress bar

I had the task of creating a small app for users to download an excel report to their local PC. Since the excel report had to be created dynamically by querying the database about 30 times on average (which would take about 20-30 seconds), the app should show a progress bar to the users which would get updated every few seconds. 

I used the popular library [Celery](https://docs.celeryproject.org/en/stable/) to run longer tasks in the background and the lightweight library [Nanobar](https://nanobar.jacoborus.codes/) to show a pretty and engaging progress bar fill up while the user is waiting for the download to complete.  

I simplified the whole backend so that the app gives you a choice to download either a short report (3 seconds) or a long report (6 seconds). This mock-report consists of todays date with a random int value. 

See below for instructions on how to set up the app including a Redis server as message broker. 

# How to setup the report downloader app on localhost

This manual describes how to setup the flask app, the celery worker and a Redis server on localhost for macOS/linux but it can also be used to run it on Windows (the commands differ of course but the tasks are nearly the same).

## Clone project and set up a virtual environment
	
	$ cd <project-folder-name>
	$ python3 -m venv venv
	$ source venv/bin/activate

To activate the virtual environment on Windows type the following:
	
	venv/Scripts/activate


## Install all requirements

	$ pip install -r requirements.txt

## Create an .env file (this should not be committed)
	
	$ touch .env
	$ vim .env

and enter below information (choose a secret-key to your liking):
	
	FLASK_APP=report_downloader.py
	SECRET_KEY=<create secret key> 
	CELERY_BROKER_URL='redis://localhost:6379/0'
	CELERY_RESULT_BACKEND='redis://localhost:6379/0'

## Add environment variables

	$ export FLASK_APP=report_downloader.py
	$ export FLASK_ENV=development

## Install and start a redis server for macOS

	$ brew update
	$ brew install redis
	$ brew services start redis
	
If you are using Windows just download redis from [here](https://github.com/microsoftarchive/redis/releases) and follow the instructions.

## Start a celery worker by following command
	
    $ celery -A celery-worker.celery worker --loglevel=INFO
    
In case of Windows the eventlet library is needed (this is just for development/test purposes, don't use celery on Windows for production):

	$ pip install -U eventlet
    $ celery -A celery-worker.celery worker --loglevel=INFO -P eventlet

## Run the application

On a different terminal run the flask app:
	
	$ flask run

Now open [localhost:5000](http://localhost:5000/) and try to download one of the reports.



# Setup app on Ec2 instance for production

In case you want to run the app in a production setting you can find the additional setup below.
If you followed the manual until now, proceed with below steps to setup a server and the necessary services.

## Add gunicorn and set up service to start app

	(venv) $ pip install gunicorn
	(venv) $ gunicorn -b localhost:8000 -w 4 <module-name>:<app-name>

## Add below "excelreport.service" file to /etc/systemd/system/ folder (fill in "app-name" with the name of your app)

	[Unit]
	Description=Report Downloader
	After=network.target
	StartLimitIntervalSec=0

	[Service]
	Type=simple
	Restart=always
	WorkingDirectory=/home/ec2-user/<app-name>/
	RestartSec=1
	ExecStart=/home/ec2-user/<app-name>/venv/bin/gunicorn -b  
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
	
## Enable, start and check status of service

	$ sudo systemctl enable redis.service
	$ sudo systemctl start redis.service
	$ sudo systemctl status redis.service

## Add report-downloader-celery-worker.service (fill in "app-name" with the name of your app):

	[Unit]
	Description=Report Downloader
	After=network.target
	StartLimitIntervalSec=0

	[Service]
	Type=simple
	Restart=always
	WorkingDirectory=/home/ec2-user/<app-name>/
	RestartSec=1
	ExecStart=/home/ec2-user/<app-name>/venv/bin/celery -A 
	celery-worker.celery worker --loglevel=INFO

	[Install]
	WantedBy=multi-user.target

## Enable, start and check status of service

	$ sudo systemctl enable report-downloader-celery-worker.service
	$ sudo systemctl start report-downloader-celery-worker.service
	$ sudo systemctl status report-downloader-celery-worker.service


### Happy downloading!

