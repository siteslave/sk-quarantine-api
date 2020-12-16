import app from './app'

const port = 8080
const address = '0.0.0.0'

const start = async () => {
  try {
    await app.listen(port, address)
    console.log('Server listening at ' + address)
  } catch (error) {
    console.log(error)
    process.exit(0)
  }
}

start()
