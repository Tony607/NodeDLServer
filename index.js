var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var childProcess=require("child_process");  

const Str_Destination = "Destination: "
const Str_DownloadFinish = "[download] 100%"
var videoName = "video.mp4"
var exeShell = function(cmd, printlistener){
  console.log(cmd)
  child = childProcess.exec(cmd,  { 
      // detachment and ignored stdin are the key here: 
      detached: true, 
      stdio: [ 'ignore', 1, 2 ], 
  }); 
  child.unref(); 
  child.stdout.on('data', function(data) {
      // console.log(data.toString()); 
      printlistener(data.toString())
  });
}
var getResolutionArg = function(resolution){
  return " -f 'bestvideo[height<="+String(resolution)+"]+bestaudio/best[height<="+String(resolution)+"]' "
}
var movieCallback = function(text){
  io.emit('chat message', text);
  if(text.indexOf(Str_Destination) !== -1 && text.toLowerCase().indexOf(".mp4") !== -1){
    videoName = text.substring(Str_Destination.length+text.indexOf(Str_Destination)).trim()
    console.log(">>>>Video name",videoName)
  }
  if(text.indexOf(Str_DownloadFinish) !== -1){
    console.log(">>>>Download finished")
    io.emit('video ready', "ready");
  }
  console.log(text)
}

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});
app.get('/video/', function(req, res){
  console.log(">>>>Send Video:",videoName)
  var options = {
    root: __dirname,
    dotfiles: 'deny',
    headers: {
        'x-timestamp': Date.now(),
        'x-sent': true
    }
  };

  res.sendFile(videoName, options, function (err) {
    if (err) {
      // next(err);
    } else {
      console.log('>>>>>>Sent:', videoName);
    }
  });
});
io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
    args = msg.split(/,| |;|\||\*/)
    url = args[0]
    resolutionArg = " "
    if(url.indexOf("youtube.com") !== -1){
      if(args.length > 1)
        if(Number(args[1])){
          resolutionArg = getResolutionArg(Number(args[1]))
      }
      cmd ="youtube-dl --restrict-filenames --recode-video mp4"+ resolutionArg +url
      exeShell(cmd, movieCallback);
    }
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
