from flask import render_template, current_app, url_for, request, jsonify, send_file
from datetime import date
from app.main import bp
from openpyxl import load_workbook
from app import celery
import random
import os
import time
import random

@bp.route('/')
@bp.route('/index')
def index():
    return render_template("index.html", title='Home Page')

# prepare celery task after pressing button on frontend
@bp.route("/report-downloader/_run_task/", methods=['POST'])
def run_task():

    # task_length -> how many seconds task will run
    req = request.get_json()
    task_length = int(req['task_length'])

    # add todays date to report
    root_path = current_app.root_path
    today = date.today().strftime('%Y-%m-%d')
    
    # start celery task
    task = download_async_report.delay(task_length, root_path, today)
    return jsonify({'Location': url_for('main.taskstatus', task_id=task.id)}) 


@celery.task(bind=True)
def download_async_report(self, task_length, root_path, today):

    # random value to set into dummy report 
    rand_int = random.randint(1,1000)
    
    # load workbook template
    wb = load_workbook('template.xlsx')
    wb.template = False
    sheet1 = wb['data']

    # set date and random value to excel-sheet
    sheet1["A1"] = "date"
    sheet1["A2"] = today
    sheet1["B1"] = "value"
    sheet1["B2"] = rand_int

    # run task and send progress update to frontend 
    for t in range(task_length):
        time.sleep(1)
        self.update_state(state='PROGRESS', meta={  'current': t, 
                                                    'total': task_length,
                                                    'status': 'Downloading...'})

    # random hash value to make excel-filename unique
    hash = random.getrandbits(16)
    filename = f"production_report_{today}_{str(hash)}.xlsx"
    filepath = os.path.join(root_path, 'reports', filename)
    wb.save(filepath)
        
    # return 100 as final value when task is done
    return {'current': 100, 
            'total': 100, 
            'status': 'Download completed!',
            'filename': filename}


@bp.route('/status/<task_id>')
def taskstatus(task_id):

    # check status of currently running task 
    task = download_async_report.AsyncResult(task_id)
    
    # pending state means not yet started
    if task.state == 'PENDING':
        response = {
            'state': task.state,
            'current': 0,
            'total': 1,
            'status': 'Pending...'
        }
    # task is progressing
    elif task.state != 'FAILURE':
        response = {
            'state': task.state,
            'current': task.info.get('current', 0),
            'total': task.info.get('total', 1),
            'status': task.info.get('status', '')
        }
        # task is completed
        if 'filename' in task.info:
            response['filename'] = task.info['filename']
    else:
        # something went wrong in the background job
        response = {
            'state': task.state,
            'current': 1,
            'total': 1,
            'status': str(task.info),  # this is the exception raised
        }
    return jsonify(response)

# excel file download to browser
@bp.route('/_downloadfile/', methods=['POST','GET'])
def downloadfile():
    
    # filepath of file to download is send to client
    filename = request.args.get('filename')
    filepath = os.path.join(current_app.root_path, 'reports', filename)
    
    try:
        return send_file(
            filepath,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True)
    except Exception as e:
        return str(e)

