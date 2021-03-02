/* 
    runs after report-download button is clicked
*/
function download_report(task_type) {
    // add task status elements
    div = $('<div class="progress_report"><div></div><div id="percentage">0%</div><div id="task-desc"></div><div></div><div id="filename">&nbsp;</div></div><hr>');
    $('#progress').empty();
    $('#progress').append(div);

    // create a progress bar
    var nanobar = new Nanobar({
        classname: 'my-nanobar-class',
        id: 'my-nanobar-id',
        // bg: '#38f',
        bg: '#E7FF4E',
        target: div[0].childNodes[0]
    });

    const data ={'task_type': task_type}
    // send ajax POST request to start background job
    $.ajax({
        type: 'POST',
        url: '/report-downloader/_run_task/',
        data: data,
        success: function (data, status, request) {
            status_url = request.getResponseHeader('Location');
            update_progress(status_url, nanobar, div[0]);
        },
        error: function() {

            console.log('Unexpected error');
        }
    });
}

function update_progress(status_url, nanobar, status_div) {
    // send GET request to status URL
    $.getJSON(status_url, function(data) {
        // update UI
        console.log("data below:")
        console.log(data)
        percent = parseInt(data['current'] * 100 / data['total']);
        nanobar.go(percent);
        $(status_div.childNodes[1]).text(percent + '%');
        $(status_div.childNodes[2]).text(data['status']);
        if (data['state'] != 'PENDING' && data['state'] != 'PROGRESS') {
            if ('result' in data) {
                // show result
                // $(status_div.childNodes[3]).text('Result: ' + data['result']);
                // $(status_div.childNodes[4]).text('Filename: ' + data['filename']);
                downloadFileToBrowser(data['result']);
                setTimeout(function(){ 
                    $('#bounce').css('-moz-animation', 'bounce 0s infinite ease');
                    $('#bounce').css('-o-animation', 'bounce 0s infinite ease');
                    $('#bounce').css('-webkit-animation', 'bounce 0s infinite ease');
                    $('#bounce').css('animation', 'bounce 0s infinite ease');
                    $('.arrow-down').css({'visibility': 'visible'}); 
                }, 1000);
                
            }
            else {
                // something unexpected happened
                // $(status_div.childNodes[3]).text('Result: ' + data['result']);
                $(status_div.childNodes[4]).text('Filename: ' + data['filename']);
            }
        }
        else {
            // rerun in 2 seconds
            console.log("now setting timeout...")
            setTimeout(function() {
                update_progress(status_url, nanobar, status_div);
            }, 1000);
        }
    });
}

function downloadFileToBrowser(result) {
  var url = '/_downloadfile' + '?' + 'filename='+ result;
  var xhr = new XMLHttpRequest()
  xhr.open("GET", url)
  xhr.responseType = 'blob'
  xhr.onload = function() {
      var blob = new Blob([this.response], {type: 'application/vnd.ms-excel'});
      var downloadUrl = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = downloadUrl;
      a.download = result;
      document.body.appendChild(a);
      a.click();
  }
  xhr.send()
}

// set current date to screen at page load
$(function () {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();

    today = mm + '/' + dd + '/' + yyyy;
    $('h1').html("Download report for " + today);
});
