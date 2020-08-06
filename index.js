const Koa = require('koa')
const app = new Koa()
const http = require('http').createServer(app.callback())
const websocket = require('socket.io')(http)
// const bodyParser = require('koa-bodyparser')
const body = require('koa-body')
const cors = require('koa2-cors')
const router = require('./router/router')
const jwt = require('./middleware/jwt')


// app.use(bodyParser())
app.use(body({ 
  multipart: true, 
  formidable:{  //对上传数据进行限制
    maxFieldsSize:20*1024*1024
  },
  keepExtensions:true  //保持上传之后文件的后缀名
}))

app.use(cors())

app.use(jwt())

app.use(router())

http.listen(9090)
console.log('app started at http://localhost:9090..')

websocket.on('connection', (socket) => {
  console.log('socket 连接成功!')
  socket.on('messageBox', (data) => {
    socket.broadcast.emit('globalMessageBox', data)
    socket.emit('globalMessageBox', data)
  })
	socket.on('message', (data) => {
    socket.broadcast.emit('globalMessage', data)
    socket.emit('globalMessage', data)
  })
  socket.on('crowdMessage', (data) => {
    socket.broadcast.emit('globalCrowdMessage', data)
    socket.emit('globalCrowdMessage', data)
  })
  socket.on('insertAnnouncement', (data) => {
    socket.broadcast.emit('globalInsertAnnouncement', data)
  })
})
