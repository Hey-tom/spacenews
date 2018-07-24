const bodyParser = require('body-parser')
const proxy = require('http-proxy-middleware')
const app = require('express')()

const API_URI = process.env.API_URI || 'http://django:8000'

app.use(bodyParser.json())

app.use(proxy({
  target: API_URI,
  changeOrigin: true,
  auth: false,
  logLevel: 'debug',
  onProxyReq(proxyReq, req, res) {
    if (req.session.authToken) {
      proxyReq.setHeader('Authorization', 'Token ' + req.session.authToken)
    }
    // workaround for bodyParser incompat
    // https://stackoverflow.com/questions/25207333/socket-hang-up-error-with-nodejs/25651651#25651651
    if (req.body) {
      let bodyData = JSON.stringify(req.body)
      // in case if content-type is application/x-www-form-urlencoded -> we need to change to application/json
      proxyReq.setHeader('Content-Type','application/json')
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData))
      // stream the content
      proxyReq.write(bodyData)
    }
  },
  async onProxyRes(proxyRes, req, res) {
    // if the API returns a 401, the token can be considered invalid. Delete the token.
    if (proxyRes.statusCode === 401) {
      delete req.session.authToken
      await req.session.save()
    }
  }
}))

module.exports = {
  path: '/api',
  handler: app
}
