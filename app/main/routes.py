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


@bp.route("/report-downloader/_run_task/", methods=['POST'])
def run_task():
    task_type = request.form['task_type']
    total_times = int(task_type)
    root_path = current_app.root_path
    today = date.today().strftime('%Y-%m-%d')
    task = download_async_report.delay(total_times, root_path, today)
    print(task.id)
    print('Downloading report...')
    return jsonify({}), 202, {'Location': url_for('main.taskstatus', task_id=task.id)}


@celery.task(bind=True)
def download_async_report(self, total_times, root_path, today):
    rand_int = random.randint(1,1000)
    wb = load_workbook('template.xlsx')
    wb.template = False
    sheet1 = wb['data']
    sheet1["A1"] = "date"
    sheet1["A2"] = today
    sheet1["B1"] = "value"
    sheet1["B2"] = rand_int

    for t in range(total_times):
        time.sleep(1)
        self.update_state(state='PROGRESS', meta={  'current': t, 
                                                    'total': total_times,
                                                    'status': 'Downloading...'})

    hash = random.getrandbits(16)
    filename = "production_report_" + today + "_" + str(hash) + ".xlsx"
    filepath = os.path.join(root_path, 'reports', filename)
    wb.save(filepath)
        
    return {'current': 100, 
            'total': 100, 
            'status': 'Download completed!',
            'result': filename}


@bp.route('/status/<task_id>')
def taskstatus(task_id):
    task = download_async_report.AsyncResult(task_id)
    if task.state == 'PENDING':
        response = {
            'state': task.state,
            'current': 0,
            'total': 1,
            'status': 'Pending...'
        }
    elif task.state != 'FAILURE':
        response = {
            'state': task.state,
            'current': task.info.get('current', 0),
            'total': task.info.get('total', 1),
            'status': task.info.get('status', '')
        }
        if 'result' in task.info:
            response['result'] = task.info['result']
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


@bp.route('/_downloadfile/', methods=['POST','GET'])
def downloadfile():
    filename = request.args.get('filename')
    filepath = os.path.join(current_app.root_path, 'reports', filename)
    print(filepath)
    try:
        return send_file(
            filepath,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True)
    except Exception as e:
        return str(e)

