import http from "http"

const server = http.createServer(function (req, res) {
  res.write("I'm alive")
  res.end()
})

const PORT = process.env.PORT || 8080

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`)
})

export default server
