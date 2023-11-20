import http from 'http'

const server = http.createServer(function (req, res) {
  res.write("I'm alive")
  res.end()
})

server.listen(8080)

export default server
