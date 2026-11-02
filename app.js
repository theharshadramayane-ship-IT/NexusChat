var express = require('express');
var path = require('path');
var http = require('http');
var socketio = require('socket.io');

var app = express();

// Express 4 Setup
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs'); 

app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', function(req, res) {
  res.render('index', { title: 'Welcome to NexusChat' });
});

app.get('/chat', function(req, res) {
  res.render('chat', { title: 'NexusChat Dashboard' });
});

app.get('/users', function(req, res) {
  res.send("respond with a resource");
});

var server = app.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});

var io = socketio.listen(server);

var clients = {};
var socketsOfClients = {};

io.sockets.on('connection', function(socket) {
  socket.on('set username', function(userName) {
    if (clients[userName] === undefined) {
      clients[userName] = socket.id;
      socketsOfClients[socket.id] = userName;
      userNameAvailable(socket.id, userName);
      userJoined(userName);
    } else if (clients[userName] === socket.id) {
      // Ignore
    } else {
      userNameAlreadyInUse(socket.id, userName);
    }
  });

  socket.on('message', function(msg) {
    var srcUser;
    if (msg.inferSrcUser) {
      srcUser = socketsOfClients[socket.id];
    } else {
      srcUser = msg.source;
    }
    
    if (msg.target == "All") {
      io.sockets.emit('message', {
        "source": srcUser,
        "message": msg.message,
        "target": msg.target
      });
    } else {
      var targetSocketId = clients[msg.target];
      if (targetSocketId && io.sockets.sockets[targetSocketId]) {
        io.sockets.sockets[targetSocketId].emit('message', {
          "source": srcUser,
          "message": msg.message,
          "target": msg.target
        });
      }
    }
  });

  socket.on('disconnect', function() {
    var uName = socketsOfClients[socket.id];
    delete socketsOfClients[socket.id];
    if (uName) {
      delete clients[uName];
      userLeft(uName);
    }
  });
});

function userJoined(uName) {
  Object.keys(socketsOfClients).forEach(function(sId) {
    if (io.sockets.sockets[sId]) {
      io.sockets.sockets[sId].emit('userJoined', { "userName": uName });
    }
  });
}

function userLeft(uName) {
  io.sockets.emit('userLeft', { "userName": uName });
}

function userNameAvailable(sId, uName) {
  setTimeout(function() {
    if (io.sockets.sockets[sId]) {
      io.sockets.sockets[sId].emit('welcome', { "userName": uName, "currentUsers": JSON.stringify(Object.keys(clients)) });
    }
  }, 500);
}

function userNameAlreadyInUse(sId, uName) {
  setTimeout(function() {
    if (io.sockets.sockets[sId]) {
      io.sockets.sockets[sId].emit('error', { "userNameInUse": true });
    }
  }, 500);
}