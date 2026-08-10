const bedrock = require('bedrock-protocol')

// Global error handlers - prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message)
  // Don't exit - let the bot try to reconnect
})
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
  // Don't exit - let the bot continue
})

const HOST = process.env.SERVER_HOST || 'Mrak980.aternos.me'
const PORT = parseInt(process.env.SERVER_PORT || '56850')
const USERNAME = process.env.BOT_USERNAME || 'Steve_Bot'
const OFFLINE = (process.env.OFFLINE_MODE || 'true') === 'true'

console.log(`Connecting to ${HOST}:${PORT} as "${USERNAME}" (offline=${OFFLINE})...`)

// ============ STATE ============
let client
let botPos = { x: 0, y: 64, z: 0 }
let botYaw = 0, botPitch = 0
let botOnGround = false
let worldBlocks = new Map() // "x,y,z" -> runtimeId
let blockRuntimeToName = new Map() // runtimeId -> block name
let entities = new Map() // runtime_id -> entity data
let currentTask = null
let taskQueue = []
let isBreaking = false
let breakingTarget = null
let breakingProgress = 0
let moveInterval = null
let attackInterval = null
let followTargetId = null
let spawned = false

// Block name sets for finding
const LOG_NAMES = new Set(['minecraft:oak_log','minecraft:spruce_log','minecraft:birch_log','minecraft:jungle_log','minecraft:acacia_log','minecraft:dark_oak_log','minecraft:mangrove_log','minecraft:cherry_log','minecraft:crimson_stem','minecraft:warped_stem'])
const LEAF_NAMES = new Set(['minecraft:oak_leaves','minecraft:spruce_leaves','minecraft:birch_leaves','minecraft:jungle_leaves','minecraft:acacia_leaves','minecraft:dark_oak_leaves','minecraft:mangrove_leaves','minecraft:cherry_leaves','minecraft:azalea_leaves','minecraft:flowering_azalea_leaves'])
const ORE_NAMES = new Set(['minecraft:coal_ore','minecraft:iron_ore','minecraft:gold_ore','minecraft:diamond_ore','minecraft:emerald_ore','minecraft:lapis_ore','minecraft:redstone_ore','minecraft:copper_ore','minecraft:deepslate_coal_ore','minecraft:deepslate_iron_ore','minecraft:deepslate_gold_ore','minecraft:deepslate_diamond_ore','minecraft:deepslate_emerald_ore','minecraft:deepslate_lapis_ore','minecraft:deepslate_redstone_ore','minecraft:deepslate_copper_ore','minecraft:nether_gold_ore','minecraft:nether_quartz_ore'])
const HOSTILE_MOBS = new Set(['minecraft:zombie','minecraft:skeleton','minecraft:creeper','minecraft:spider','minecraft:enderman','minecraft:witch','minecraft:slime','minecraft:phantom','minecraft:drowned','minecraft:husk','minecraft:piglin','minecraft:zombie_villager','minecraft:blaze','minecraft:ghast','minecraft:magma_cube','minecraft:hoglin','minecraft:zoglin','minecraft:piglin_brute','minecraft:wither_skeleton','minecraft:guardian','minecraft:elder_guardian','minecraft:shulker','minecraft:silverfish','minecraft:endermite','minecraft:vex','minecraft:stray','minecraft:bogged','minecraft:cave_spider','minecraft:ravager','minecraft:evoker','minecraft:vindicator','minecraft:pillager'])

// ============ HELPERS ============
function blockKey(x, y, z) {
  return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`
}

function getBlock(x, y, z) {
  return worldBlocks.get(blockKey(x, y, z))
}

function getBlockName(x, y, z) {
  const rt = getBlock(x, y, z)
  if (rt === undefined) return null
  return blockRuntimeToName.get(rt) || `runtime_${rt}`
}

function distance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z
  return Math.sqrt(dx*dx + dy*dy + dz*dz)
}

function distance2D(a, b) {
  const dx = a.x - b.x, dz = a.z - b.z
  return Math.sqrt(dx*dx + dz*dz)
}

function sendChat(msg) {
  if (!client) return
  client.write('text', {
    type: 'chat',
    source_name: USERNAME,
    message: msg,
    xuid: '',
    platform_chat_id: ''
  })
  console.log('[bot says]', msg)
}

function stopMovement() {
  if (moveInterval) { clearInterval(moveInterval); moveInterval = null }
  if (attackInterval) { clearInterval(attackInterval); attackInterval = null }
  // Send stop movement
  if (client) {
    client.write('player_auth_input', {
      input_data: { forward: false, backward: false, left: false, right: false, jumping: false, sneaking: false },
      position: { x: botPos.x, y: botPos.y, z: botPos.z, pitch: botPitch, yaw: botYaw, head_yaw: botYaw, on_ground: botOnGround }
    })
  }
}

function stopAllTasks() {
  stopMovement()
  currentTask = null
  taskQueue = []
  isBreaking = false
  breakingTarget = null
  followTargetId = null
  sendChat('Stopped all tasks.')
}

// ============ CHUNK PARSING ============
function readVarint(buf, offset) {
  let result = 0, shift = 0
  while (true) {
    const byte = buf.readUInt8(offset++)
    result |= (byte & 0x7F) << shift
    if ((byte & 0x80) === 0) break
    shift += 7
  }
  return { value: result, offset }
}

function parseLevelChunk(buf, offset) {
  // Parse chunk data from level_chunk packet
  const chunkX = buf.readInt32LE(offset); offset += 4
  const chunkZ = buf.readInt32LE(offset); offset += 4
  
  const subChunkCount = buf.readUInt16LE(offset); offset += 2
  
  for (let s = 0; s < subChunkCount; s++) {
    const version = buf.readUInt8(offset); offset++
    
    if (version === 8 || version === 9) {
      // Palette-based with layers
      const numLayers = buf.readUInt8(offset); offset++
      
      for (let l = 0; l < numLayers; l++) {
        const header = buf.readUInt8(offset); offset++
        const bitsPerBlock = header >> 1
        const isSingleValue = (header & 1) === 0
        
        if (bitsPerBlock === 0) {
          // Single value palette
          const sv = readVarint(buf, offset); offset = sv.offset
          const rt = readVarint(buf, offset); offset = rt.offset
          // All 4096 blocks in this subchunk are rt
          const subchunkY = s
          for (let i = 0; i < 4096; i++) {
            const lx = i & 0xF
            const ly = (i >> 4) & 0xF
            const lz = (i >> 8) & 0xF
            const wx = chunkX * 16 + lx
            const wy = subchunkY * 16 + ly
            const wz = chunkZ * 16 + lz
            worldBlocks.set(blockKey(wx, wy, wz), rt)
          }
        } else {
          // Palette-based
          const numWords = Math.ceil(4096 * bitsPerBlock / 32)
          const words = []
          for (let w = 0; w < numWords; w++) {
            words.push(buf.readUInt32LE(offset)); offset += 4
          }
          
          const palSize = readVarint(buf, offset); offset = palSize.offset
          const palette = []
          for (let p = 0; p < palSize.value; p++) {
            const entry = readVarint(buf, offset); offset = entry.offset
            palette.push(entry.value)
          }
          
          const blocksPerWord = Math.floor(32 / bitsPerBlock)
          const mask = (1 << bitsPerBlock) - 1
          const subchunkY = s
          
          for (let i = 0; i < 4096; i++) {
            const wordIdx = Math.floor(i / blocksPerWord)
            const bitOff = (i % blocksPerWord) * bitsPerBlock
            const idx = (words[wordIdx] >> bitOff) & mask
            const rt = palette[idx]
            
            const lx = i & 0xF
            const ly = (i >> 4) & 0xF
            const lz = (i >> 8) & 0xF
            const wx = chunkX * 16 + lx
            const wy = subchunkY * 16 + ly
            const wz = chunkZ * 16 + lz
            worldBlocks.set(blockKey(wx, wy, wz), rt)
          }
        }
      }
    } else if (version === 1) {
      // Single layer, palette-based
      const bitsPerBlock = buf.readUInt8(offset); offset++
      const numWords = Math.ceil(4096 * bitsPerBlock / 32)
      const words = []
      for (let w = 0; w < numWords; w++) {
        words.push(buf.readUInt32LE(offset)); offset += 4
      }
      const palSize = readVarint(buf, offset); offset = palSize.offset
      const palette = []
      for (let p = 0; p < palSize.value; p++) {
        const entry = readVarint(buf, offset); offset = entry.offset
        palette.push(entry.value)
      }
      const blocksPerWord = Math.floor(32 / bitsPerBlock)
      const mask = (1 << bitsPerBlock) - 1
      const subchunkY = s
      for (let i = 0; i < 4096; i++) {
        const wordIdx = Math.floor(i / blocksPerWord)
        const bitOff = (i % blocksPerWord) * bitsPerBlock
        const idx = (words[wordIdx] >> bitOff) & mask
        const rt = palette[idx]
        const lx = i & 0xF, ly = (i >> 4) & 0xF, lz = (i >> 8) & 0xF
        worldBlocks.set(blockKey(chunkX*16+lx, subchunkY*16+ly, chunkZ*16+lz), rt)
      }
    }
  }
}

// ============ BLOCK FINDING ============
function findNearestBlock(blockNames, maxRadius = 64) {
  const nameSet = new Set(blockNames)
  let nearest = null, nearestDist = Infinity
  
  for (const [key, rt] of worldBlocks) {
    const name = blockRuntimeToName.get(rt)
    if (!name || !nameSet.has(name)) continue
    const [x, y, z] = key.split(',').map(Number)
    const d = distance2D(botPos, { x, y, z })
    if (d < nearestDist && d <= maxRadius && y > 0) {
      nearest = { x, y, z, name }
      nearestDist = d
    }
  }
  return nearest
}

function findBlocksOfType(blockNames, maxRadius = 64) {
  const nameSet = new Set(blockNames)
  const found = []
  for (const [key, rt] of worldBlocks) {
    const name = blockRuntimeToName.get(rt)
    if (!name || !nameSet.has(name)) continue
    const [x, y, z] = key.split(',').map(Number)
    const d = distance2D(botPos, { x, y, z })
    if (d <= maxRadius && y > 0) {
      found.push({ x, y, z, name, dist: d })
    }
  }
  found.sort((a, b) => a.dist - b.dist)
  return found
}

function findTreeBase(maxRadius = 64) {
  // Find the nearest log block, then trace down to find the base
  const logs = findBlocksOfType([...LOG_NAMES], maxRadius)
  if (logs.length === 0) return null
  
  // Group logs into trees (logs within 5 blocks of each other)
  const tree = logs[0]
  return { x: tree.x, y: tree.y, z: tree.z }
}

// ============ MOVEMENT ============
function lookAt(target) {
  const dx = target.x - botPos.x
  const dz = target.z - botPos.z
  const dy = target.y - botPos.y
  botYaw = Math.atan2(-dx, -dz) * (180 / Math.PI)
  botPitch = Math.atan2(dy, Math.sqrt(dx*dx + dz*dz)) * (180 / Math.PI)
}

function moveToward(target, stopDistance = 2.0) {
  const dx = target.x - botPos.x
  const dz = target.z - botPos.z
  const dy = target.y - botPos.y
  const dist = Math.sqrt(dx*dx + dz*dz)
  
  if (dist < stopDistance) {
    stopMovement()
    return true // arrived
  }
  
  lookAt(target)
  
  // Determine movement direction
  const forward = Math.sin(botYaw * Math.PI / 180) * dx + Math.cos(botYaw * Math.PI / 180) * dz > 0
  const right = Math.cos(botYaw * Math.PI / 180) * dx - Math.sin(botYaw * Math.PI / 180) * dz > 0
  
  // Check if we need to jump (block above or step up)
  const blockAbove = getBlock(botPos.x, botPos.y + 2, botPos.z)
  const blockInFront = getBlock(botPos.x + Math.sin(botYaw*Math.PI/180), botPos.y + 1, botPos.z + Math.cos(botYaw*Math.PI/180))
  const jumping = (blockAbove !== undefined && blockAbove !== 0) || (blockInFront !== undefined && blockInFront !== 0 && dy > 0.5)
  
  if (!moveInterval) {
    moveInterval = setInterval(() => {
      if (!client || !spawned) return
      const input = {
        forward: dist > stopDistance,
        backward: false,
        left: false,
        right: false,
        jumping: jumping,
        sneaking: false
      }
      
      // Recalculate direction
      const dx2 = target.x - botPos.x
      const dz2 = target.z - botPos.z
      const dist2 = Math.sqrt(dx2*dx2 + dz2*dz2)
      
      if (dist2 < stopDistance) {
        stopMovement()
        return
      }
      
      lookAt(target)
      
      client.write('player_auth_input', {
        input_data: input,
        position: { x: botPos.x, y: botPos.y, z: botPos.z, pitch: botPitch, yaw: botYaw, head_yaw: botYaw, on_ground: botOnGround }
      })
    }, 100)
  }
  
  return false
}

// ============ BLOCK BREAKING ============
function breakBlock(blockPos) {
  if (!client) return
  const blockName = getBlockName(blockPos.x, blockPos.y, blockPos.z)
  if (!blockName || blockName === 'minecraft:air') return
  
  console.log(`Breaking block at ${blockPos.x},${blockPos.y},${blockPos.z} (${blockName})`)
  isBreaking = true
  breakingTarget = blockPos
  breakingProgress = 0
  
  // Look at the block
  lookAt(blockPos)
  
  // Send start break
  client.write('inventory_transaction', {
    transaction_type: 'item_use',
    actions: [],
    action_type: 0, // start break
    block_position: { x: blockPos.x, y: blockPos.y, z: blockPos.z },
    face: 1,
    hotbar_slot: 0,
    held_item: { network_id: 0 },
    position: { x: botPos.x, y: botPos.y, z: botPos.z },
    click_position: { x: 0.5, y: 0.5, z: 0.5 }
  })
  
  // Simulate breaking over time
  const breakTime = 30 // ticks to break (adjust based on block hardness)
  let tick = 0
  const breakInterval = setInterval(() => {
    tick++
    if (tick >= breakTime) {
      clearInterval(breakInterval)
      // Send stop break (complete)
      client.write('inventory_transaction', {
        transaction_type: 'item_use',
        actions: [],
        action_type: 1, // stop break / crack
        block_position: { x: blockPos.x, y: blockPos.y, z: blockPos.z },
        face: 1,
        hotbar_slot: 0,
        held_item: { network_id: 0 },
        position: { x: botPos.x, y: botPos.y, z: botPos.z },
        click_position: { x: 0.5, y: 0.5, z: 0.5 }
      })
      isBreaking = false
      breakingTarget = null
    }
  }, 50)
}

// ============ ENTITY FIGHTING ============
function findNearestMob(maxRadius = 32) {
  let nearest = null, nearestDist = Infinity
  for (const [id, entity] of entities) {
    if (!entity.type) continue
    const isMob = HOSTILE_MOBS.has(entity.type) || 
                  entity.type.includes('zombie') || entity.type.includes('skeleton') || 
                  entity.type.includes('creeper') || entity.type.includes('spider') ||
                  entity.type.includes('enderman') || entity.type.includes('witch') ||
                  entity.type.includes('slime') || entity.type.includes('phantom') ||
                  entity.type.includes('piglin') || entity.type.includes('blaze') ||
                  entity.type.includes('ghast') || entity.type.includes('hoglin')
    if (!isMob) continue
    const d = distance(botPos, entity.position)
    if (d < nearestDist && d <= maxRadius) {
      nearest = entity
      nearestDist = d
    }
  }
  return nearest
}

function attackEntity(entity) {
  if (!client || !entity) return
  
  const d = distance(botPos, entity.position)
  if (d > 4) {
    // Move toward entity
    moveToward(entity.position, 2.5)
    return
  }
  
  stopMovement()
  lookAt(entity.position)
  
  // Send attack
  client.write('inventory_transaction', {
    transaction_type: 'item_use_on_entity',
    runtime_entity_id: entity.id,
    action_type: 1, // attack
    hotbar_slot: 0,
    held_item: { network_id: 0 },
    position: { x: botPos.x, y: botPos.y, z: botPos.z },
    click_position: { x: 0.5, y: 0.5, z: 0.5 }
  })
  
  console.log(`Attacking ${entity.type} (id: ${entity.id})`)
}

// ============ TASK PROCESSOR ============
function processNextTask() {
  if (currentTask) return // already doing something
  if (taskQueue.length === 0) return
  
  currentTask = taskQueue.shift()
  
  switch (currentTask.type) {
    case 'chop':
      doChopTree()
      break
    case 'mine':
      doMine(currentTask.block)
      break
    case 'fight':
      doFight()
      break
    case 'find':
      doFind(currentTask.target)
      break
    case 'come':
      doCome()
      break
    case 'follow':
      doFollow()
      break
    default:
      currentTask = null
      processNextTask()
  }
}

function doChopTree() {
  sendChat('Looking for trees...')
  const tree = findTreeBase(48)
  if (!tree) {
    sendChat('No trees found nearby. Try moving to a forest area.')
    currentTask = null
    processNextTask()
    return
  }
  
  sendChat(`Found tree at ${tree.x}, ${tree.y}, ${tree.z}. Chopping!`)
  
  // Chop logs from bottom to top
  const logsToChop = []
  for (let dy = 0; dy < 12; dy++) {
    const y = tree.y + dy
    const name = getBlockName(tree.x, y, tree.z)
    if (name && LOG_NAMES.has(name)) {
      logsToChop.push({ x: tree.x, y, z: tree.z, name })
    } else if (dy > 2) {
      break // reached top of tree
    }
  }
  
  let idx = 0
  function chopNext() {
    if (idx >= logsToChop.length) {
      sendChat('Finished chopping!')
      currentTask = null
      processNextTask()
      return
    }
    const log = logsToChop[idx++]
    const d = distance(botPos, log)
    if (d > 4) {
      moveToward(log, 3)
      setTimeout(chopNext, 500)
      return
    }
    breakBlock(log)
    setTimeout(chopNext, 800)
  }
  chopNext()
}

function doMine(blockName) {
  const name = blockName || 'coal_ore'
  const fullName = name.startsWith('minecraft:') ? name : `minecraft:${name}`
  
  sendChat(`Looking for ${name}...`)
  const block = findNearestBlock([fullName], 48)
  if (!block) {
    sendChat(`No ${name} found nearby.`)
    currentTask = null
    processNextTask()
    return
  }
  
  sendChat(`Found ${name} at ${block.x}, ${block.y}, ${block.z}. Mining!`)
  
  const d = distance(botPos, block)
  if (d > 4) {
    moveToward(block, 3)
    const waitMove = setInterval(() => {
      if (distance(botPos, block) <= 4) {
        clearInterval(waitMove)
        breakBlock(block)
        setTimeout(() => {
          sendChat(`Mined ${name}!`)
          currentTask = null
          processNextTask()
        }, 2000)
      }
    }, 200)
  } else {
    breakBlock(block)
    setTimeout(() => {
      sendChat(`Mined ${name}!`)
      currentTask = null
      processNextTask()
    }, 2000)
  }
}

function doFight() {
  sendChat('Looking for mobs to fight...')
  const mob = findNearestMob(32)
  if (!mob) {
    sendChat('No hostile mobs nearby.')
    currentTask = null
    processNextTask()
    return
  }
  
  sendChat(`Found ${mob.type}! Attacking!`)
  
  attackInterval = setInterval(() => {
    if (!currentTask || currentTask.type !== 'fight') {
      if (attackInterval) { clearInterval(attackInterval); attackInterval = null }
      return
    }
    
    // Check if mob still exists
    const currentMob = entities.get(mob.id)
    if (!currentMob) {
      sendChat('Mob defeated or despawned!')
      clearInterval(attackInterval); attackInterval = null
      // Look for next mob
      const nextMob = findNearestMob(32)
      if (nextMob) {
        sendChat(`Found ${nextMob.type}! Attacking!`)
        attackEntity(nextMob)
      } else {
        sendChat('No more mobs nearby.')
        currentTask = null
        processNextTask()
      }
      return
    }
    
    attackEntity(currentMob)
  }, 500)
}

function doFind(target) {
  const name = target || 'diamond_ore'
  const fullName = name.startsWith('minecraft:') ? name : `minecraft:${name}`
  
  sendChat(`Searching for ${name}...`)
  const block = findNearestBlock([fullName], 64)
  if (!block) {
    sendChat(`No ${name} found within 64 blocks.`)
    currentTask = null
    processNextTask()
    return
  }
  
  sendChat(`Found ${name} at ${block.x}, ${block.y}, ${block.z}. Going there!`)
  
  const d = distance(botPos, block)
  moveToward(block, 3)
  
  const waitMove = setInterval(() => {
    if (!currentTask || currentTask.type !== 'find') {
      clearInterval(waitMove)
      return
    }
    if (distance(botPos, block) <= 4) {
      clearInterval(waitMove)
      sendChat(`Arrived at ${name}!`)
      currentTask = null
      processNextTask()
    }
  }, 200)
}

function doCome() {
  if (!client.runtime_id) {
    sendChat('Not fully connected yet, try again in a moment.')
    currentTask = null
    processNextTask()
    return
  }
  // Find nearest player and go to them
  let nearestPlayer = null, nearestDist = Infinity
  for (const [id, entity] of entities) {
    if (entity.type === 'minecraft:player' && id !== client.runtime_id) {
      const d = distance(botPos, entity.position)
      if (d < nearestDist) {
        nearestPlayer = entity
        nearestDist = d
      }
    }
  }
  
  if (!nearestPlayer) {
    sendChat('No players found nearby.')
    currentTask = null
    processNextTask()
    return
  }
  
  sendChat(`Coming to you!`)
  moveToward(nearestPlayer.position, 2)
  
  const waitMove = setInterval(() => {
    if (!currentTask || currentTask.type !== 'come') {
      clearInterval(waitMove)
      return
    }
    const p = entities.get(nearestPlayer.id)
    if (!p) {
      clearInterval(waitMove)
      sendChat('Player gone.')
      currentTask = null
      processNextTask()
      return
    }
    if (distance(botPos, p.position) <= 3) {
      clearInterval(waitMove)
      stopMovement()
      sendChat('I am here!')
      currentTask = null
      processNextTask()
    }
  }, 200)
}

function doFollow() {
  if (!client.runtime_id) {
    sendChat('Not fully connected yet, try again in a moment.')
    currentTask = null
    processNextTask()
    return
  }
  // Find nearest player and follow them
  let nearestPlayer = null
  for (const [id, entity] of entities) {
    if (entity.type === 'minecraft:player' && id !== client.runtime_id) {
      nearestPlayer = entity
      break
    }
  }
  
  if (!nearestPlayer) {
    sendChat('No players found to follow.')
    currentTask = null
    processNextTask()
    return
  }
  
  followTargetId = nearestPlayer.id
  sendChat(`Following ${nearestPlayer.type}!`)
  
  const followInterval = setInterval(() => {
    if (!currentTask || currentTask.type !== 'follow' || followTargetId === null) {
      clearInterval(followInterval)
      return
    }
    const p = entities.get(followTargetId)
    if (!p) {
      clearInterval(followInterval)
      sendChat('Lost the player.')
      currentTask = null
      processNextTask()
      return
    }
    const d = distance(botPos, p.position)
    if (d > 3) {
      moveToward(p.position, 2.5)
    } else {
      stopMovement()
    }
  }, 300)
}

// ============ CHAT COMMANDS ============
function handleChat(message) {
  const msg = message.trim()
  if (!msg.startsWith('!')) return
  
  const parts = msg.split(/\s+/)
  const cmd = parts[0].toLowerCase()
  const args = parts.slice(1)
  
  switch (cmd) {
    case '!help':
      sendChat('Commands: !chop, !mine <block>, !fight, !find <thing>, !come, !follow, !stop, !status')
      break
    case '!chop':
      taskQueue.push({ type: 'chop' })
      sendChat('Added to queue: chop trees')
      processNextTask()
      break
    case '!mine':
      taskQueue.push({ type: 'mine', block: args.join(' ') || 'coal_ore' })
      sendChat(`Added to queue: mine ${args.join(' ') || 'coal_ore'}`)
      processNextTask()
      break
    case '!fight':
      taskQueue.push({ type: 'fight' })
      sendChat('Added to queue: fight mobs')
      processNextTask()
      break
    case '!find':
      taskQueue.push({ type: 'find', target: args.join(' ') || 'diamond_ore' })
      sendChat(`Added to queue: find ${args.join(' ') || 'diamond_ore'}`)
      processNextTask()
      break
    case '!come':
      taskQueue.push({ type: 'come' })
      sendChat('Added to queue: come to you')
      processNextTask()
      break
    case '!follow':
      taskQueue.push({ type: 'follow' })
      sendChat('Added to queue: follow you')
      processNextTask()
      break
    case '!stop':
      stopAllTasks()
      break
    case '!status':
      const taskCount = taskQueue.length + (currentTask ? 1 : 0)
      sendChat(`Tasks: ${taskCount} | Blocks cached: ${worldBlocks.size} | Entities: ${entities.size}`)
      break
    default:
      sendChat(`Unknown command: ${cmd}. Type !help for commands.`)
  }
}

// ============ CONNECTION ============
function connect() {
  client = bedrock.createClient({
    host: HOST,
    port: PORT,
    username: USERNAME,
    offline: OFFLINE,
    skipPing: true
  })

  client.on('spawn', () => {
    spawned = true
    console.log('Bot has spawned and is now visible as a player in the world.')
  })

  client.on('start_game', (packet) => {
    try {
      console.log('start_game packet keys:', Object.keys(packet).join(', '))
      // Store runtime_id for identifying the bot in entity updates
      if (packet.runtime_id !== undefined) {
        client.runtime_id = packet.runtime_id
      }
      // Map runtime IDs to block names
      if (packet.block_palette) {
        for (const entry of packet.block_palette) {
          if (entry.name) {
            blockRuntimeToName.set(entry.runtime_id, entry.name)
          }
        }
      }
      // Safely get spawn position - field name varies by version
      if (packet.spawn) {
        botPos = { x: packet.spawn.x, y: packet.spawn.y, z: packet.spawn.z }
      } else if (packet.player_position) {
        botPos = { x: packet.player_position.x, y: packet.player_position.y, z: packet.player_position.z }
      }
      console.log(`Bot runtime_id: ${client.runtime_id}, position: ${botPos.x}, ${botPos.y}, ${botPos.z}`)
    } catch (err) {
      console.error('Error in start_game handler:', err.message)
    }
  })

  // Track position from auth input
  client.on('player_auth_input', (packet) => {
    try {
      if (packet.position) {
        botPos.x = packet.position.x
        botPos.y = packet.position.y
        botPos.z = packet.position.z
        if (packet.position.pitch !== undefined) botPitch = packet.position.pitch
        if (packet.position.yaw !== undefined) botYaw = packet.position.yaw
        if (packet.position.on_ground !== undefined) botOnGround = packet.position.on_ground
      }
    } catch (e) {
      console.warn('player_auth_input error:', e.message)
    }
  })

  // Track position from set_spawn_position / move_player packets
  client.on('set_spawn_position', (packet) => {
    try {
      if (packet.position) {
        botPos = { x: packet.position.x, y: packet.position.y, z: packet.position.z }
        console.log(`Spawn position updated: ${botPos.x}, ${botPos.y}, ${botPos.z}`)
      }
    } catch (e) {
      console.warn('set_spawn_position error:', e.message)
    }
  })

  client.on('move_player', (packet) => {
    try {
      if (packet.position && packet.runtime_id === client.runtime_id) {
        botPos = { x: packet.position.x, y: packet.position.y, z: packet.position.z }
      }
    } catch (e) {
      console.warn('move_player error:', e.message)
    }
  })

  client.on('respawn', (packet) => {
    try {
      if (packet.position) {
        botPos = { x: packet.position.x, y: packet.position.y, z: packet.position.z }
        console.log(`Respawned at: ${botPos.x}, ${botPos.y}, ${botPos.z}`)
      }
    } catch (e) {
      console.warn('respawn error:', e.message)
    }
  })

  // Track entities
  client.on('spawn_entity', (packet) => {
    try {
      entities.set(packet.runtime_id, {
        id: packet.runtime_id,
        type: packet.type || 'unknown',
        position: packet.position || { x: 0, y: 64, z: 0 },
        metadata: packet.metadata
      })
    } catch (e) {
      console.warn('spawn_entity error:', e.message)
    }
  })

  client.on('remove_entity', (packet) => {
    entities.delete(packet.runtime_id)
  })

  client.on('move_entity', (packet) => {
    try {
      const entity = entities.get(packet.runtime_id)
      if (entity && packet.position) {
        entity.position = packet.position
      }
    } catch (e) {
      console.warn('move_entity error:', e.message)
    }
  })

  // Track blocks from chunk data
  client.on('level_chunk', (packet) => {
    try {
      parseLevelChunk(Buffer.from(packet.data), 0)
    } catch (e) {
      console.warn('Chunk parse error (non-fatal):', e.message)
    }
  })

  // Track block updates
  client.on('update_block', (packet) => {
    try {
      const key = blockKey(packet.position.x, packet.position.y, packet.position.z)
      if (packet.block_runtime_id === 0) {
        worldBlocks.delete(key)
      } else {
        worldBlocks.set(key, packet.block_runtime_id)
      }
    } catch (e) {
      console.warn('update_block error:', e.message)
    }
  })

  // Chat commands
  client.on('text', (packet) => {
    if (!packet.message) return
    console.log('[chat]', packet.message)
    try {
      handleChat(packet.message)
    } catch (e) {
      console.warn('handleChat error:', e.message)
    }
  })

  client.on('disconnect', (packet) => {
    spawned = false
    console.log('Disconnected:', packet.reason || packet.message)
  })

  client.on('close', () => {
    spawned = false
    console.log('Connection closed. Reconnecting in 15s...')
    setTimeout(connect, 15000)
  })

  client.on('kick', (reason) => {
    spawned = false
    console.log('Kicked:', reason)
  })

  client.on('error', (err) => {
    console.error('Client error:', err.message)
  })
}

connect()
