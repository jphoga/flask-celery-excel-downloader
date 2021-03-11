/**  
 *  Run at page load 
 */

// create todays date in EN-format "March 5, 2021" 
const options = { year: 'numeric', month: 'long', day: 'numeric' };
const today = new Date().toLocaleDateString('en-EN', options);

// set todays date to title on index-page
const title = document.getElementById("title");
title.innerText = `Download Report for ${today}`;


/**
 *  Start download process
 */

const download_report = (task_length) => {
    
    // get elements to update progress bar and status
    const progressReportContainer = document.getElementsByClassName("progress_report")[0]
    const progressBar = document.getElementById("progress_bar")
    const percentage = document.getElementById("percentage")
    
    // reset status after each download
    progressBar.innerText = "";
    percentage.innerText = "";

    // create progress bar instance
    const nanobar = new Nanobar({
        classname: 'my-nanobar-class',
        id: 'my-nanobar-id',
        bg: '#E7FF4E',
        target: progressBar
    });

    // how long the task will run in sec
    const data = { 'task_length': task_length }
    
    // start background job
    fetch('/report-downloader/_run_task/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(data => {
        const status_url = data['Location'];
        // kick-off realtime update of progress bar
        update_progress(status_url, nanobar, progressReportContainer);
    })
    .catch ((error) => {
        console.log('Unexpected error');            
    })
}

const update_progress = (status_url, nanobar, status_div) => {

    // Get current progress from task 
    fetch(status_url)
    .then(response => response.json())
        .then(data => {
        
        // update current progress on UI
        percent = parseInt(data['current'] * 100 / data['total']);
        nanobar.go(percent);
        status_div.childNodes[3].innerText = percent + '%';
        status_div.childNodes[5].innerText = data['status'];
        
        // Check current status of task
        if (data['state'] != 'PENDING' && data['state'] != 'PROGRESS') {
            // CASE: Task completed
            if ('result' in data) {
                // start download of excel-file
                downloadFileToBrowser(data['result']);
                setTimeout(function () {
                    
                    // stop bouncing of file-icon on top of page
                    const bounce = document.getElementById("bounce");
                    bounce.style.cssText = '-moz-animation: bounce 0s infinite ease';
                    bounce.style.cssText = '-o-animation: bounce 0s infinite ease';
                    bounce.style.cssText = '-webkit-animation: bounce 0s infinite ease';
                    bounce.style.cssText = 'animation: bounce 0s infinite ease';

                    // show arrow-icon to guide user to downloaded file on left bottom of page
                    const isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);
                    if (isChrome) {
                        const arrow = document.getElementsByClassName("arrow-down");
                        arrow[0].style.cssText = 'visibility: visible';
                    };
                }, 1000);                    
            }
            // CASE: Error
            else {
                // show error on screen
                $(status_div.childNodes[4]).text('Filename: ' + data['filename']);
            }
        }
        else {
            // CASE:  Pending (task not started) or Progress (task running)
            setTimeout(() => {
                update_progress(status_url, nanobar, status_div);
            }, 1000);
        }
    })
}

const downloadFileToBrowser = (result) => {
    const url = `/_downloadfile?filename=${result}`;
    fetch(url)
    .then(response => response.blob())
    .then(function(myBlob) {
        const downloadUrl = URL.createObjectURL(myBlob);
        
        // create temporary link to be able to download file by HTML Api
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = result;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        /*  file download possible without adding link as above by using window.location
            Problem: need to find a way to add file name to downloaded file */
        // window.location.assign(downloadUrl);
        window.URL.revokeObjectURL(downloadUrl);
    })
}