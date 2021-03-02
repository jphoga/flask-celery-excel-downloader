![download-screen](https://github.com/jphoga/flask-celery-excel-downloader/blob/main/download-screen.jpg?raw=true)


# Flask app to download excel file while showing task-progress

I had the task of creating a small app for users to download an excel report to their local PC. Since the excel report had to be created dynamically by querying the database about 30 times on average (which would take about 20-30 seconds), the app should show a progress-bar to the users which would get updated every few seconds. 

The report-creation process must be independent of the current app process or otherwise the app would just stop working until the download is completed. To realize this I used the popular library [Celery](https://docs.celeryproject.org/en/stable/) where you can create a so-called "worker" who runs longer tasks in the background.

Celery can send status updates of its current task to the frontend where the progress bar can be updated quite simply. I chose the lightweight library [Nanobar](https://nanobar.jacoborus.codes/) to show a pretty and engaging progress bar fill up while the user is waiting for the download to complete.  

For the purpose of this repository I simplified the whole backend so that the app gives you a choice to download either a short report (3 seconds) or a long report (6 seconds). The report consists of todays date with a random int value. In a real application you would fill up your excel-file with data send back by querying your database. 

See below for instructions on how to set up the app including a Redis server as message broker. 

# How to setup the report downloader app on localhost

This manual describes how to setup the flask app, the celery worker and a Redis server on localhost for macOS but it can also be used to run it on Windows.

## Clone project and move into the project root folder to set up a virtual environment
	
	$ cd <project-folder-name>
	$ python3 -m venv venv
	$ source venv/bin/activate
	$ mkdir reports


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
	$ export FLASK_ENV=production

## Install and start a redis server for macOS

	$ brew update
	$ brew install redis
	$ brew services start redis

## Start a celery worker by following command

### for Windows (eventlet is needed):

	$ pip install -U eventlet
    	$ celery -A celery-worker.celery worker --loglevel=INFO -P eventlet
	
### for maxOS & Linux:

    	$ celery -A celery-worker.celery worker --loglevel=INFO

Now open [localhost:5000](http://localhost:5000/) and try to download one of the reports.



# How to setup the report downloader app on an Ec2 instance for production

In case you want to run the app in a production setting you can find the additional setup below.
If you followed the manual until now, proceed with below steps to setup a server and the necessary services.

## Add gunicorn and set up service to start app

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
	
## Enable, start and check status of service

	$ sudo systemctl enable redis.service
	$ sudo systemctl start redis.service
	$ sudo systemctl status redis.service

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

## Enable, start and check status of service

	$ sudo systemctl enable report-downloader-celery-worker.service
	$ sudo systemctl start report-downloader-celery-worker.service
	$ sudo systemctl status report-downloader-celery-worker.service


### Happy downloading!

