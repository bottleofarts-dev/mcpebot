const bedrock = require('bedrock-protocol')

const HOST = process.env.SERVER_HOST || 'Mrak980.aternos.me'
const PORT = parseInt(process.env.SERVER_PORT || '56850')
const USERNAME = process.env.BOT_USERNAME || 'TestBot_' + Math.floor(Math.random() * 1000)

console.log(`[minimal] Connecting to ${HOST}:${PORT} as "${USERNAME}"...`)

const client = bedrock.createClient({
  host: HOST,
  port: PORT,
  username: USERNAME,
  offline: true,
  skipPing: true,
  autoInitPlayer: false
})

client.on('join', () => {
  console.log('[minimal] Joined server - doing nothing, just listening...')
})

client.on('spawn', () => {
  console.log('[minimal] Spawned - staying completely idle')
  // Do NOT send any packets - just stay connected
})

client.on('kick', (reason) => {
  console.log('[minimal] Kicked:', reason)
})

client.on('disconnect', (reason) => {
  console.log('[minimal] Disconnected:', reason)
})

client.on('close', () => {
  console.log('[minimal] Connection closed')
})

client.on('error', (err) => {
  console.error('[minimal] Error:', err.message)
})

// Do nothing else - no packet handlers, no movement, no chat
console.log('[minimal] Bot is now idle. No packets will be sent.')
