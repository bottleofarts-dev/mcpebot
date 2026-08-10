const bedrock = require('bedrock-protocol')

const HOST = process.env.SERVER_HOST || 'Mrak980.aternos.me'
const PORT = parseInt(process.env.SERVER_PORT || '56850')
const USERNAME = process.env.BOT_USERNAME || 'Steve_Bot'

console.log(`[bot] Connecting to ${HOST}:${PORT} as "${USERNAME}"...`)

const client = bedrock.createClient({
  host: HOST,
  port: PORT,
  username: USERNAME,
  offline: false,  // Try online mode for proper XUID
  skipPing: true
})

client.on('join', () => {
  console.log('[bot] Joined server')
})

client.on('spawn', () => {
  console.log('[bot] Bot has spawned and is now visible in the world')
})

client.on('text', (packet) => {
  if (packet.message) console.log('[chat]', packet.message)
})

client.on('kick', (reason) => {
  console.log('[bot] Kicked:', reason)
})

client.on('disconnect', (reason) => {
  console.log('[bot] Disconnected:', reason)
})

client.on('close', () => {
  console.log('[bot] Connection closed')
})

client.on('error', (err) => {
  console.error('[bot] Error:', err.message)
})

// Handle Microsoft device code auth if needed
client.on('onMsaCode', (data) => {
  console.log('[bot] Microsoft auth required:', data.message)
})

console.log('[bot] Bot is running')
