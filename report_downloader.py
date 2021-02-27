from app import create_app

report_downloader = create_app()

if __name__ == '__main__':
    report_downloader.run(host="0.0.0.0", port=5000, use_debugger=False, use_reloader=False, passthrough_errors=True)
    