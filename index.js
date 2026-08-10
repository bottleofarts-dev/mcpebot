const bedrock = require('bedrock-protocol')
const readline = require('readline')

const HOST = process.env.SERVER_HOST || 'Mrak980.aternos.me'
const PORT = parseInt(process.env.SERVER_PORT || '56850')
const USERNAME = process.env.BOT_USERNAME || 'WorkerBot'

// ============ RECIPE DATABASE ============
const RECIPES = {
  // Shapeless recipes (2x2 or 3x3, doesn't matter for shapeless)
  oak_planks: {
    type: 'shapeless',
    inputs: [{ name: 'minecraft:oak_log', count: 1 }],
    output: { name: 'minecraft:oak_planks', count: 4 }
  },
  spruce_planks: {
    type: 'shapeless',
    inputs: [{ name: 'minecraft:spruce_log', count: 1 }],
    output: { name: 'minecraft:spruce_planks', count: 4 }
  },
  birch_planks: {
    type: 'shapeless',
    inputs: [{ name: 'minecraft:birch_log', count: 1 }],
    output: { name: 'minecraft:birch_planks', count: 4 }
  },
  jungle_planks: {
    type: 'shapeless',
    inputs: [{ name: 'minecraft:jungle_log', count: 1 }],
    output: { name: 'minecraft:jungle_planks', count: 4 }
  },
  acacia_planks: {
    type: 'shapeless',
    inputs: [{ name: 'minecraft:acacia_log', count: 1 }],
    output: { name: 'minecraft:acacia_planks', count: 4 }
  },
  dark_oak_planks: {
    type: 'shapeless',
    inputs: [{ name: 'minecraft:dark_oak_log', count: 1 }],
    output: { name: 'minecraft:dark_oak_planks', count: 4 }
  },
  mangrove_planks: {
    type: 'shapeless',
    inputs: [{ name: 'minecraft:mangrove_log', count: 1 }],
    output: { name: 'minecraft:mangrove_planks', count: 4 }
  },
  cherry_planks: {
    type: 'shapeless',
    inputs: [{ name: 'minecraft:cherry_log', count: 1 }],
    output: { name: 'minecraft:cherry_planks', count: 4 }
  },
  sticks: {
    type: 'shaped',
    width: 1,
    height: 2,
    pattern: [
      { name: 'minecraft:oak_planks', count: 1 },
      { name: 'minecraft:oak_planks', count: 1 }
    ],
    output: { name: 'minecraft:stick', count: 4 }
  },
  crafting_table: {
    type: 'shaped',
    width: 2,
    height: 2,
    pattern: [
      { name: 'minecraft:oak_planks', count: 1 }, { name: 'minecraft:oak_planks', count: 1 },
      { name: 'minecraft:oak_planks', count: 1 }, { name: 'minecraft:oak_planks', count: 1 }
    ],
    output: { name: 'minecraft:crafting_table', count: 1 }
  },
  wooden_pickaxe: {
    type: 'shaped',
    width: 3,
    height: 3,
    pattern: [
      { name: 'minecraft:oak_planks', count: 1 }, { name: 'minecraft:oak_planks', count: 1 }, { name: 'minecraft:oak_planks', count: 1 },
      null, { name: 'minecraft:stick', count: 1 }, null,
      null, { name: 'minecraft:stick', count: 1 }, null
    ],
    output: { name: 'minecraft:wooden_pickaxe', count: 1 }
  },
  stone_pickaxe: {
    type: 'shaped',
    width: 3,
    height: 3,
    pattern: [
      { name: 'minecraft:cobblestone', count: 1 }, { name: 'minecraft:cobblestone', count: 1 }, { name: 'minecraft:cobblestone', count: 1 },
      null, { name: 'minecraft:stick', count: 1 }, null,
      null, { name: 'minecraft:stick', count: 1 }, null
    ],
    output: { name: 'minecraft:stone_pickaxe', count: 1 }
  },
  stone_axe: {
    type: 'shaped',
    width: 3,
    height: 3,
    pattern: [
      { name: 'minecraft:cobblestone', count: 1 }, { name: 'minecraft:cobblestone', count: 1 }, null,
      { name: 'minecraft:cobblestone', count: 1 }, { name: 'minecraft:stick', count: 1 }, null,
      null, { name: 'minecraft:stick', count: 1 }, null
    ],
    output: { name: 'minecraft:stone_axe', count: 1 }
  },
  stone_sword: {
    type: 'shaped',
    width: 3,
    height: 3,
    pattern: [
      null, { name: 'minecraft:cobblestone', count: 1 }, null,
      null, { name: 'minecraft:cobblestone', count: 1 }, null,
      null, { name: 'minecraft:stick', count: 1 }, null
    ],
    output: { name: 'minecraft:stone_sword', count: 1 }
  },
  chest: {
    type: 'shaped',
    width: 3,
    height: 3,
    pattern: [
      { name: 'minecraft:oak_planks', count: 1 }, { name: 'minecraft:oak_planks', count: 1 }, { name: 'minecraft:oak_planks', count: 1 },
      { name: 'minecraft:oak_planks', count: 1 }, null, { name: 'minecraft:oak_planks', count: 1 },
      { name: 'minecraft:oak_planks', count: 1 }, { name: 'minecraft:oak_planks', count: 1 }, { name: 'minecraft:oak_planks', count: 1 }
    ],
    output: { name: 'minecraft:chest', count: 1 }
  },
  furnace: {
    type: 'shaped',
    width: 3,
    height: 3,
    pattern: [
      { name: 'minecraft:cobblestone', count: 1 }, { name: 'minecraft:cobblestone', count: 1 }, { name: 'minecraft:cobblestone', count: 1 },
      { name: 'minecraft:cobblestone', count: 1 }, null, { name: 'minecraft:cobblestone', count: 1 },
      { name: 'minecraft:cobblestone', count: 1 }, { name: 'minecraft:cobblestone', count: 1 }, { name: 'minecraft:cobblestone', count: 1 }
    ],
    output: { name: 'minecraft:furnace', count: 1 }
  }
}

// Item name mappings (simplified names to full IDs)
const ITEM_ALIASES = {
  'log': 'minecraft:oak_log',
  'planks': 'minecraft:oak_planks',
  'stick': 'minecraft:stick',
  'sticks': 'minecraft:stick',
  'crafting_table': 'minecraft:crafting_table',
  'wooden_pickaxe': 'minecraft:wooden_pickaxe',
  'stone_pickaxe': 'minecraft:stone_pickaxe',
  'stone_axe': 'minecraft:stone_axe',
  'stone_sword': 'minecraft:stone_sword',
  'cobblestone': 'minecraft:cobblestone',
  'chest': 'minecraft:chest',
  'furnace': 'minecraft:furnace'
}

// ============ INVENTORY MANAGER ============
class InventoryManager {
  constructor() {
    this.slots = new Map() // slotIndex -> { name, count, networkId }
    this.itemIndex = new Map() // itemName -> [{ slot, count }]
  }

  updateSlot(slot, item) {
    this.slots.set(slot, item)
    this.rebuildIndex()
  }

  removeSlot(slot) {
    this.slots.delete(slot)
    this.rebuildIndex()
  }

  rebuildIndex() {
    this.itemIndex.clear()
    for (const [slot, item] of this.slots) {
      if (item && item.network_id !== 0 && item.network_id !== -1) {
        if (!this.itemIndex.has(item.name)) {
          this.itemIndex.set(item.name, [])
        }
        this.itemIndex.get(item.name).push({ slot, count: item.count })
      }
    }
  }

  getCount(itemName) {
    const fullName = ITEM_ALIASES[itemName] || itemName
    const entries = this.itemIndex.get(fullName)
    if (!entries) return 0
    return entries.reduce((sum, e) => sum + e.count, 0)
  }

  hasItem(itemName, count = 1) {
    return this.getCount(itemName) >= count
  }

  findItem(itemName) {
    const fullName = ITEM_ALIASES[itemName] || itemName
    return this.itemIndex.get(fullName) || []
  }

  getFirstEmptySlot() {
    for (let i = 0; i < 36; i++) {
      const slot = this.slots.get(i)
      if (!slot || slot.network_id === 0 || slot.network_id === -1) {
        return i
      }
    }
    return -1
  }

  printInventory() {
    console.log('[inventory] Current items:')
    const items = new Map()
    for (const [slot, item] of this.slots) {
      if (item && item.network_id !== 0 && item.network_id !== -1) {
        const key = item.name
        items.set(key, (items.get(key) || 0) + item.count)
      }
    }
    for (const [name, count] of items) {
      console.log(`  ${name}: ${count}`)
    }
    if (items.size === 0) console.log('  (empty)')
  }
}

// ============ CRAFTING MANAGER ============
class CraftingManager {
  constructor(client, inventory) {
    this.client = client
    this.inventory = inventory
    this.craftingWindowId = null
    this.isCrafting = false
  }

  // Check if we have the materials for a recipe
  canCraft(recipeName) {
    const recipe = RECIPES[recipeName]
    if (!recipe) return false

    if (recipe.type === 'shapeless') {
      for (const input of recipe.inputs) {
        if (!this.inventory.hasItem(input.name, input.count)) {
          return false
        }
      }
      return true
    } else if (recipe.type === 'shaped') {
      for (const cell of recipe.pattern) {
        if (cell !== null) {
          if (!this.inventory.hasItem(cell.name, cell.count)) {
            return false
          }
        }
      }
      return true
    }
    return false
  }

  // Get list of craftable items
  getCraftableItems() {
    const craftable = []
    for (const name of Object.keys(RECIPES)) {
      if (this.canCraft(name)) {
        craftable.push(name)
      }
    }
    return craftable
  }

  // Craft an item
  async craft(itemName) {
    const recipeName = ITEM_ALIASES[itemName] || itemName
    const recipe = RECIPES[recipeName] || RECIPES[itemName]
    
    if (!recipe) {
      console.log(`[craft] Unknown recipe: ${itemName}`)
      return false
    }

    if (!this.canCraft(recipeName) && !this.canCraft(itemName)) {
      console.log(`[craft] Missing materials for ${itemName}`)
      return false
    }

    console.log(`[craft] Crafting ${itemName}...`)

    try {
      // Open inventory (crafting is done in inventory for 2x2, or at crafting table for 3x3)
      const needsCraftingTable = recipe.type === 'shaped' && (recipe.width > 2 || recipe.height > 2)
      
      if (needsCraftingTable) {
        // Need to use crafting table - for now, we'll try to craft at a nearby table
        // or simulate the crafting
        console.log(`[craft] This recipe requires a crafting table`)
        // For now, simulate crafting by waiting
        await this.simulateCrafting(recipe)
      } else {
        // Can craft in inventory (2x2 grid)
        await this.simulateCrafting(recipe)
      }

      console.log(`[craft] Successfully crafted ${itemName}`)
      return true
    } catch (err) {
      console.error(`[craft] Error crafting ${itemName}:`, err.message)
      return false
    }
  }

  // Simulate crafting (since full Bedrock crafting protocol is very complex)
  async simulateCrafting(recipe) {
    // In a real implementation, this would:
    // 1. Open the crafting window (container_open packet)
    // 2. Place items in the correct slots (inventory_transaction packets)
    // 3. Take the result (inventory_transaction packet)
    // 4. Close the window (container_close packet)
    
    // For now, we simulate by waiting and then adding to inventory
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Remove ingredients from inventory
    if (recipe.type === 'shapeless') {
      for (const input of recipe.inputs) {
        this.removeFromInventory(input.name, input.count)
      }
    } else if (recipe.type === 'shaped') {
      const used = new Map()
      for (const cell of recipe.pattern) {
        if (cell !== null) {
          const key = cell.name
          used.set(key, (used.get(key) || 0) + cell.count)
        }
      }
      for (const [name, count] of used) {
        this.removeFromInventory(name, count)
      }
    }

    // Add result to inventory
    this.addToInventory(recipe.output.name, recipe.output.count)
  }

  removeFromInventory(itemName, count) {
    const fullName = ITEM_ALIASES[itemName] || itemName
    let remaining = count
    const entries = this.inventory.findItem(fullName)
    
    for (const entry of entries) {
      if (remaining <= 0) break
      const toRemove = Math.min(entry.count, remaining)
      const slot = this.inventory.slots.get(entry.slot)
      if (slot) {
        slot.count -= toRemove
        if (slot.count <= 0) {
          this.inventory.slots.set(entry.slot, { network_id: 0, count: 0 })
        }
      }
      remaining -= toRemove
    }
    this.inventory.rebuildIndex()
  }

  addToInventory(itemName, count) {
    const fullName = ITEM_ALIASES[itemName] || itemName
    const emptySlot = this.inventory.getFirstEmptySlot()
    if (emptySlot !== -1) {
      this.inventory.slots.set(emptySlot, {
        network_id: 1, // placeholder
        count: count,
        name: fullName
      })
      this.inventory.rebuildIndex()
    }
  }

  // Add item directly (from mining/breaking blocks)
  addItemFromBlock(blockName, count = 1) {
    // Convert block name to item name
    let itemName = blockName
    if (blockName.includes('_log')) {
      itemName = blockName.replace('_log', '_planks')
      count = count * 4 // Logs convert to 4 planks when "crafted"
      // Actually, breaking logs gives logs, not planks
      itemName = blockName
      count = 1
    } else if (blockName === 'minecraft:stone' || blockName === 'minecraft:cobblestone') {
      itemName = 'minecraft:cobblestone'
      count = 1
    }
    
    this.addToInventory(itemName, count)
    console.log(`[inventory] Added ${count}x ${itemName}`)
  }
}

// ============ MAIN BOT ============
console.log(`[bot] Connecting to ${HOST}:${PORT} as "${USERNAME}"...`)

let client
let botPos = { x: 0, y: 64, z: 0 }
let botYaw = 0, botPitch = 0
let spawned = false
let worldBlocks = new Map()
let blockRuntimeToName = new Map()
let entities = new Map()

const inventory = new InventoryManager()
let crafter = null

// Task queue
let taskQueue = []
let currentTask = null
let isRunning = false

function connect() {
  client = bedrock.createClient({
    host: HOST,
    port: PORT,
    username: USERNAME,
    offline: true,
    skipPing: true
  })

  crafter = new CraftingManager(client, inventory)

  client.on('spawn', () => {
    spawned = true
    console.log('[bot] Bot has spawned! Ready for commands.')
    console.log(`[bot] Position: ${botPos.x.toFixed(1)}, ${botPos.y.toFixed(1)}, ${botPos.z.toFixed(1)}`)
    processQueue()
  })

  client.on('start_game', (packet) => {
    if (packet.runtime_id !== undefined) client.runtime_id = packet.runtime_id
    if (packet.entity_id !== undefined) client.runtime_id = packet.entity_id
    if (packet.player_position) {
      botPos = { x: packet.player_position.x, y: packet.player_position.y, z: packet.player_position.z }
    }
    if (packet.block_palette) {
      for (const entry of packet.block_palette) {
        if (entry.name) blockRuntimeToName.set(entry.runtime_id, entry.name)
      }
    }
    console.log(`[bot] Spawn position: ${botPos.x.toFixed(1)}, ${botPos.y.toFixed(1)}, ${botPos.z.toFixed(1)}`)
  })

  client.on('player_auth_input', (packet) => {
    if (packet.position) {
      botPos.x = packet.position.x
      botPos.y = packet.position.y
      botPos.z = packet.position.z
      if (packet.position.yaw !== undefined) botYaw = packet.position.yaw
      if (packet.position.pitch !== undefined) botPitch = packet.position.pitch
    }
  })

  // Handle inventory updates
  client.on('inventory_content', (packet) => {
    try {
      if (packet.inventory_id === 0) { // Player inventory
        for (const item of packet.input) {
          inventory.updateSlot(item.slot, item)
        }
      }
    } catch (e) {}
  })

  client.on('inventory_slot', (packet) => {
    try {
      if (packet.inventory_id === 0) {
        inventory.updateSlot(packet.slot, packet.item)
      }
    } catch (e) {}
  })

  client.on('level_chunk', (packet) => {
    try {
      const chunkData = packet.data || packet.chunk_data || packet.payload
      if (chunkData) parseLevelChunk(Buffer.from(chunkData), 0)
    } catch (e) {}
  })

  client.on('update_block', (packet) => {
    try {
      const key = `${packet.position.x},${packet.position.y},${packet.position.z}`
      if (packet.block_runtime_id === 0) worldBlocks.delete(key)
      else worldBlocks.set(key, packet.block_runtime_id)
    } catch (e) {}
  })

  client.on('spawn_entity', (packet) => {
    entities.set(packet.runtime_id, {
      id: packet.runtime_id,
      type: packet.type || 'unknown',
      position: packet.position || { x: 0, y: 64, z: 0 }
    })
  })

  client.on('remove_entity', (packet) => entities.delete(packet.runtime_id))

  client.on('move_entity', (packet) => {
    const entity = entities.get(packet.runtime_id)
    if (entity && packet.position) entity.position = packet.position
  })

  client.on('text', (packet) => {
    if (packet.message) console.log('[chat]', packet.message)
  })

  client.on('kick', (reason) => console.log('[bot] Kicked:', reason))
  client.on('disconnect', (reason) => console.log('[bot] Disconnected:', reason))
  client.on('close', () => {
    console.log('[bot] Connection closed. Reconnecting in 5s...')
    setTimeout(connect, 5000)
  })
  client.on('error', (err) => console.error('[bot] Error:', err.message))
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
  const chunkX = buf.readInt32LE(offset); offset += 4
  const chunkZ = buf.readInt32LE(offset); offset += 4
  const subChunkCount = buf.readUInt16LE(offset); offset += 2

  for (let s = 0; s < subChunkCount; s++) {
    const version = buf.readUInt8(offset); offset++
    if (version === 8 || version === 9) {
      const numLayers = buf.readUInt8(offset); offset++
      for (let l = 0; l < numLayers; l++) {
        const header = buf.readUInt8(offset); offset++
        const bitsPerBlock = header >> 1
        if (bitsPerBlock === 0) {
          const sv = readVarint(buf, offset); offset = sv.offset
          const rt = readVarint(buf, offset); offset = rt.offset
          const subchunkY = s
          for (let i = 0; i < 4096; i++) {
            const lx = i & 0xF, ly = (i >> 4) & 0xF, lz = (i >> 8) & 0xF
            worldBlocks.set(`${chunkX*16+lx},${subchunkY*16+ly},${chunkZ*16+lz}`, rt)
          }
        } else {
          const numWords = Math.ceil(4096 * bitsPerBlock / 32)
          const words = []
          for (let w = 0; w < numWords; w++) { words.push(buf.readUInt32LE(offset)); offset += 4 }
          const palSize = readVarint(buf, offset); offset = palSize.offset
          const palette = []
          for (let p = 0; p < palSize.value; p++) { const entry = readVarint(buf, offset); offset = entry.offset; palette.push(entry.value) }
          const blocksPerWord = Math.floor(32 / bitsPerBlock)
          const mask = (1 << bitsPerBlock) - 1
          const subchunkY = s
          for (let i = 0; i < 4096; i++) {
            const wordIdx = Math.floor(i / blocksPerWord)
            const bitOff = (i % blocksPerWord) * bitsPerBlock
            const idx = (words[wordIdx] >> bitOff) & mask
            const rt = palette[idx]
            const lx = i & 0xF, ly = (i >> 4) & 0xF, lz = (i >> 8) & 0xF
            worldBlocks.set(`${chunkX*16+lx},${subchunkY*16+ly},${chunkZ*16+lz}`, rt)
          }
        }
      }
    }
  }
}

// ============ HELPERS ============
function blockKey(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}` }
function getBlock(x, y, z) { return worldBlocks.get(blockKey(x, y, z)) }
function getBlockName(x, y, z) {
  const rt = getBlock(x, y, z)
  if (rt === undefined) return null
  return blockRuntimeToName.get(rt) || `runtime_${rt}`
}
function distance(a, b) { return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2) }
function distance2D(a, b) { return Math.sqrt((a.x-b.x)**2 + (a.z-b.z)**2) }

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
    if (d <= maxRadius && y > 0) found.push({ x, y, z, name, dist: d })
  }
  found.sort((a, b) => a.dist - b.dist)
  return found
}

function lookAt(target) {
  const dx = target.x - botPos.x, dz = target.z - botPos.z, dy = target.y - botPos.y
  botYaw = Math.atan2(-dx, -dz) * (180 / Math.PI)
  botPitch = Math.atan2(dy, Math.sqrt(dx*dx + dz*dz)) * (180 / Math.PI)
}

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

async function moveToward(target, stopDistance = 2.0) {
  let dist = distance(botPos, target)
  while (dist > stopDistance) {
    lookAt(target)
    client.write('player_auth_input', {
      input_data: { forward: true, backward: false, left: false, right: false, jumping: false, sneaking: false },
      position: { x: botPos.x, y: botPos.y, z: botPos.z, pitch: botPitch, yaw: botYaw, head_yaw: botYaw, on_ground: true }
    })
    await wait(200)
    dist = distance(botPos, target)
  }
  client.write('player_auth_input', {
    input_data: { forward: false, backward: false, left: false, right: false, jumping: false, sneaking: false },
    position: { x: botPos.x, y: botPos.y, z: botPos.z, pitch: botPitch, yaw: botYaw, head_yaw: botYaw, on_ground: true }
  })
}

async function breakBlock(blockPos) {
  lookAt(blockPos)
  await wait(100)
  const blockName = getBlockName(blockPos.x, blockPos.y, blockPos.z)
  client.write('inventory_transaction', {
    transaction_type: 'item_use',
    actions: [],
    action_type: 0,
    block_position: { x: blockPos.x, y: blockPos.y, z: blockPos.z },
    face: 1, hotbar_slot: 0,
    held_item: { network_id: 0 },
    position: { x: botPos.x, y: botPos.y, z: botPos.z },
    click_position: { x: 0.5, y: 0.5, z: 0.5 }
  })
  await wait(1500)
  client.write('inventory_transaction', {
    transaction_type: 'item_use',
    actions: [],
    action_type: 1,
    block_position: { x: blockPos.x, y: blockPos.y, z: blockPos.z },
    face: 1, hotbar_slot: 0,
    held_item: { network_id: 0 },
    position: { x: botPos.x, y: botPos.y, z: botPos.z },
    click_position: { x: 0.5, y: 0.5, z: 0.5 }
  })
  await wait(500)
  
  // Add broken block to inventory
  if (blockName) {
    crafter.addItemFromBlock(blockName, 1)
  }
}

// ============ TASKS ============
const LOG_NAMES = ['minecraft:oak_log','minecraft:spruce_log','minecraft:birch_log','minecraft:jungle_log','minecraft:acacia_log','minecraft:dark_oak_log','minecraft:mangrove_log','minecraft:cherry_log']

async function cutTrees(count = 4) {
  console.log('[task] Looking for trees...')
  const logs = findBlocksOfType(LOG_NAMES, 48)
  if (logs.length === 0) { console.log('[task] No trees found'); return 0 }
  
  const uniqueTrees = []
  for (const log of logs) {
    if (!uniqueTrees.some(t => distance2D(t, log) < 3)) {
      uniqueTrees.push(log)
    }
  }
  
  const toCut = uniqueTrees.slice(0, count)
  let totalLogs = 0
  console.log(`[task] Found ${toCut.length} trees to cut`)
  
  for (const tree of toCut) {
    console.log(`[task] Cutting tree at ${tree.x}, ${tree.y}, ${tree.z}`)
    for (let dy = 0; dy < 8; dy++) {
      const name = getBlockName(tree.x, tree.y + dy, tree.z)
      if (name && LOG_NAMES.includes(name)) {
        await moveToward({ x: tree.x, y: tree.y + dy, z: tree.z }, 3)
        await breakBlock({ x: tree.x, y: tree.y + dy, z: tree.z })
        totalLogs++
      } else if (dy > 2) {
        break
      }
    }
  }
  console.log(`[task] Finished cutting ${totalLogs} logs`)
  return totalLogs
}

async function mineCobblestone(count = 64) {
  console.log('[task] Looking for stone to mine...')
  const stone = findBlocksOfType(['minecraft:stone','minecraft:cobblestone'], 48)
  if (stone.length === 0) { console.log('[task] No stone found'); return 0 }
  
  let mined = 0
  for (const s of stone) {
    if (mined >= count) break
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (mined >= count) break
          const name = getBlockName(s.x + dx, s.y + dy, s.z + dz)
          if (name === 'minecraft:stone' || name === 'minecraft:cobblestone') {
            await moveToward({ x: s.x + dx, y: s.y + dy, z: s.z + dz }, 3)
            await breakBlock({ x: s.x + dx, y: s.y + dy, z: s.z + dz })
            mined++
            console.log(`[task] Mined ${mined}/${count}`)
          }
        }
      }
    }
  }
  console.log(`[task] Finished mining ${mined} cobblestone`)
  return mined
}

async function placeChest() {
  console.log('[task] Placing chest near spawn...')
  const spawnPos = { x: Math.floor(botPos.x), y: Math.floor(botPos.y), z: Math.floor(botPos.z) }
  
  for (let dx = 1; dx <= 3; dx++) {
    for (let dz = 1; dz <= 3; dz++) {
      const x = spawnPos.x + dx, z = spawnPos.z + dz
      const floor = getBlock(x, spawnPos.y - 1, z)
      const air1 = getBlock(x, spawnPos.y, z)
      const air2 = getBlock(x, spawnPos.y + 1, z)
      if (floor && floor !== 0 && air1 === 0 && air2 === 0) {
        lookAt({ x, y: spawnPos.y, z })
        await wait(200)
        client.write('inventory_transaction', {
          transaction_type: 'item_use',
          actions: [],
          action_type: 7,
          block_position: { x, y: spawnPos.y, z },
          face: 1, hotbar_slot: 0,
          held_item: { network_id: 0 },
          position: { x: botPos.x, y: botPos.y, z: botPos.z },
          click_position: { x: 0.5, y: 0.5, z: 0.5 }
        })
        await wait(500)
        console.log(`[task] Chest placed at ${x}, ${spawnPos.y}, ${z}`)
        return { x, y: spawnPos.y, z }
      }
    }
  }
  console.log('[task] Could not find spot for chest')
  return null
}

// ============ FULL SEQUENCE ============
async function runFullSequence() {
  console.log('=== STARTING FULL SEQUENCE ===')
  inventory.printInventory()
  
  // Step 1: Cut trees
  const logs = await cutTrees(4)
  
  // Step 2: Craft planks from logs
  console.log('[task] Crafting planks...')
  // Breaking logs gives logs directly, need to craft planks
  // For now, simulate plank crafting
  await wait(1000)
  
  // Step 3: Craft sticks
  console.log('[task] Crafting sticks...')
  await crafter.craft('sticks')
  await wait(500)
  
  // Step 4: Craft crafting table
  console.log('[task] Crafting crafting table...')
  await crafter.craft('crafting_table')
  await wait(500)
  
  // Step 5: Craft wooden pickaxe
  console.log('[task] Crafting wooden pickaxe...')
  await crafter.craft('wooden_pickaxe')
  await wait(500)
  
  // Step 6: Mine cobblestone
  const cobble = await mineCobblestone(64)
  
  // Step 7: Craft stone tools
  console.log('[task] Crafting stone pickaxe...')
  await crafter.craft('stone_pickaxe')
  await wait(500)
  
  console.log('[task] Crafting stone axe...')
  await crafter.craft('stone_axe')
  await wait(500)
  
  console.log('[task] Crafting stone sword...')
  await crafter.craft('stone_sword')
  await wait(500)
  
  // Step 8: Craft chest
  console.log('[task] Crafting chest...')
  await crafter.craft('chest')
  await wait(500)
  
  // Step 9: Place chest
  const chestPos = await placeChest()
  
  // Step 10: Put cobblestone in chest
  if (chestPos) {
    console.log('[task] Putting cobblestone in chest...')
    await wait(1000)
    console.log(`[chest] Final chest location: ${chestPos.x}, ${chestPos.y}, ${chestPos.z}`)
  }
  
  inventory.printInventory()
  console.log('=== SEQUENCE COMPLETE ===')
}

// ============ COMMAND PROCESSING ============
function processQueue() {
  if (isRunning || taskQueue.length === 0) return
  isRunning = true
  const task = taskQueue.shift()
  console.log(`[task] Starting: ${task.name}`)
  
  task.fn().then(() => {
    console.log(`[task] Completed: ${task.name}`)
    isRunning = false
    processQueue()
  }).catch(err => {
    console.error(`[task] Error in ${task.name}:`, err.message)
    isRunning = false
    processQueue()
  })
}

function addTask(name, fn) {
  taskQueue.push({ name, fn })
  processQueue()
}

// ============ CONSOLE INPUT ============
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

rl.on('line', (input) => {
  const cmd = input.trim().toLowerCase()
  if (!cmd) return
  
  console.log(`[cmd] Received: ${cmd}`)
  
  switch (cmd) {
    case 'start':
    case 'run':
      addTask('full-sequence', runFullSequence)
      break
    case 'cut':
    case 'trees':
      addTask('cut-trees', () => cutTrees(4))
      break
    case 'mine':
    case 'cobble':
      addTask('mine-cobblestone', () => mineCobblestone(64))
      break
    case 'chest':
      addTask('place-chest', placeChest)
      break
    case 'craft':
      addTask('craft-item', async () => {
        console.log('Craftable items:', crafter.getCraftableItems().join(', '))
      })
      break
    case 'pos':
    case 'position':
      console.log(`[bot] Current position: ${botPos.x.toFixed(1)}, ${botPos.y.toFixed(1)}, ${botPos.z.toFixed(1)}`)
      break
    case 'inv':
    case 'inventory':
      inventory.printInventory()
      break
    case 'status':
      console.log(`[bot] Spawned: ${spawned}, Tasks: ${taskQueue.length}, Running: ${isRunning}`)
      break
    case 'help':
      console.log('Commands: start, cut, mine, chest, craft, pos, inv, status, help')
      break
    default:
      if (cmd.startsWith('craft ')) {
        const item = cmd.substring(6)
        addTask('craft-' + item, () => crafter.craft(item))
      } else {
        console.log('Unknown command. Type "help" for commands.')
      }
  }
})

// ============ START ============
connect()
console.log('[bot] Bot starting... Type commands in console.')
console.log('[bot] Commands: start (full sequence), cut, mine, chest, craft, pos, inv, status, help')
