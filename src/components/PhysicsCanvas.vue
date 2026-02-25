<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import Matter from 'matter-js'
import { gameState } from '../store/gameStore'
import { BUCKET_TYPES, ALL_BUCKET_TYPES, BUCKET_POINTS } from '../constants'

const props = defineProps<{
  m?: number
  b?: number
  isCommitted: boolean
  scaleParam: number // 10 to 50, determines grid size
}>()

const emit = defineEmits<{
  (e: 'ball-result', points: number): void
}>()

const gridCanvasRef = ref<HTMLCanvasElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Matter.js objects
let engine: Matter.Engine
let render: Matter.Render
let runner: Matter.Runner
let ball: Matter.Body | null = null
let lineBody: Matter.Body | null = null
let bucketSensors: Matter.Body[] = []
let obstacleBodies: Matter.Body[] = []

const WIDTH = 800
const HEIGHT = 600

let isDrawingLine = false
let lineAnimationData: any = null
let ballDropTime: number | null = null

let audioCtx: AudioContext | null = null
const playTone = (frequency: number, type: OscillatorType, duration: number) => {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()
    
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime)
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime) // volume
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration)
    
    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    
    oscillator.start()
    oscillator.stop(audioCtx.currentTime + duration)
  } catch(e) { console.warn('Audio play failed', e) }
}

const playScoreSound = (points: number) => {
    if (points > 0) {
        playTone(600, 'sine', 0.3)
        setTimeout(() => playTone(800, 'sine', 0.5), 100)
    } else if (points < 0 && points !== BUCKET_POINTS[BUCKET_TYPES.MULTIPLY_2X] && points !== BUCKET_POINTS[BUCKET_TYPES.INTEREST_10_PERCENT]) {
        playTone(200, 'square', 0.6)
    } else {
        playTone(400, 'sine', 0.2)
        setTimeout(() => playTone(600, 'sine', 0.2), 150)
        setTimeout(() => playTone(1200, 'sine', 0.4), 300)
    }
}

const playObstacleBounceSound = () => {
    playTone(800, 'triangle', 0.05)
}

const generateBuckets = () => {
  const buckets = []
  const numBuckets = Math.floor(Math.random() * 4) + 5 // 5 to 8 buckets
  // We want to avoid duplicates.
  // Let's create a pool of possible bucket types and shuffle/pick from it.
  const shuffledTypes = [...ALL_BUCKET_TYPES].sort(() => 0.5 - Math.random())
  const selectedTypes = shuffledTypes.slice(0, numBuckets)

  let currentX = 0
  
  // Randomize bucket properties
  for (let i = 0; i < numBuckets; i++) {
    const width = (WIDTH / numBuckets) * (Math.random() * 0.5 + 0.75) // vary width slightly
    const type = selectedTypes[i]
    
    buckets.push({ x: currentX, width, type })
    currentX += width
  }
  
  // Create static sensors at the bottom
  const sensors = buckets.map(b => {
    const sensor = Matter.Bodies.rectangle(b.x + b.width / 2, HEIGHT - 20, b.width, 40, {
      isStatic: true,
      isSensor: true,
      label: `bucket_${b.type}`
    })
    return sensor
  })
  
  // +2x multiplier acts weirdly. Better strings: '2x', '+10%', '+20%', '-15%', 'BANKRUPT 👹'
  return sensors
}

let ballVelocityX = 3 // initial speed
const spawnStaticBall = () => {
  if (ball) {
    Matter.World.remove(engine.world, ball)
  }
  const randomX = Math.random() * (WIDTH - 100) + 50
  
  // Calculate speed based on round. Base speed of 3, +0.5 per round
  ballVelocityX = 3 + (gameState.currentRound - 1) * 0.5
  // Randomize initial direction
  if (Math.random() > 0.5) ballVelocityX *= -1
  
  ball = Matter.Bodies.circle(randomX, 30, 15, {
    isStatic: true, // we'll manually move it
    restitution: 0.5,
    render: { fillStyle: '#ff5e5e' }
  })
  Matter.World.add(engine.world, ball)
}

const regenerateBuckets = () => {
  if (bucketSensors.length > 0) {
    Matter.World.remove(engine.world, bucketSensors)
  }
  bucketSensors = generateBuckets()
  Matter.World.add(engine.world, bucketSensors)
}

const generateObstacles = () => {
  const obstacles: {x: number, y: number}[] = []
  const numObstacles = 10 + Math.floor(Math.random() * 5) // 10 to 14 obstacles
  const minDistance = 80
  
  for (let i = 0; i < 100; i++) {
      if (obstacles.length >= numObstacles) break
      
      const x = Math.random() * (WIDTH - 100) + 50
      const y = Math.random() * (HEIGHT - 250) + 120
      
      let tooClose = false
      for (const obs of obstacles) {
          const dx = x - obs.x
          const dy = y - obs.y
          if (Math.sqrt(dx*dx + dy*dy) < minDistance) {
              tooClose = true
              break
          }
      }
      
      if (!tooClose) {
          obstacles.push({ x, y })
      }
  }
  
  return obstacles.map(obs => Matter.Bodies.circle(obs.x, obs.y, 8, {
      isStatic: true,
      label: 'obstacle',
      restitution: 0.8,
      render: { fillStyle: '#aaa' }
  }))
}

const regenerateObstacles = () => {
  if (obstacleBodies.length > 0) {
    Matter.World.remove(engine.world, obstacleBodies)
  }
  obstacleBodies = generateObstacles()
  Matter.World.add(engine.world, obstacleBodies)
}

const drawGrid = (ctx: CanvasRenderingContext2D) => {
  const scale = props.scaleParam // e.g., 20 pixels per unit
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  
  const midX = WIDTH / 2
  const midY = HEIGHT / 2
  
  ctx.beginPath()
  // Vertical lines
  for (let x = midX; x < WIDTH; x += scale) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, HEIGHT)
  }
  for (let x = midX; x > 0; x -= scale) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, HEIGHT)
  }
  // Horizontal lines
  for (let y = midY; y < HEIGHT; y += scale) {
    ctx.moveTo(0, y)
    ctx.lineTo(WIDTH, y)
  }
  for (let y = midY; y > 0; y -= scale) {
    ctx.moveTo(0, y)
    ctx.lineTo(WIDTH, y)
  }
  ctx.stroke()
  
  // Axes
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, midY)
  ctx.lineTo(WIDTH, midY)
  ctx.moveTo(midX, 0)
  ctx.lineTo(midX, HEIGHT)
  ctx.stroke()

  // Labels
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = '12px Outfit'
  ctx.textAlign = 'center'
  
  // X axis labels
  for (let x = midX + scale; x < WIDTH; x += scale) {
    ctx.fillText(((x - midX) / scale).toString(), x, midY + 15)
  }
  for (let x = midX - scale; x > 0; x -= scale) {
    ctx.fillText(((x - midX) / scale).toString(), x, midY + 15)
  }
  
  // Y axis labels (inverted because canvas Y goes down)
  ctx.textAlign = 'right'
  for (let y = midY + scale; y < HEIGHT; y += scale) {
    ctx.fillText((-(y - midY) / scale).toString(), midX - 5, y + 4)
  }
  for (let y = midY - scale; y > 0; y -= scale) {
    ctx.fillText((-(y - midY) / scale).toString(), midX - 5, y + 4)
  }
  
  // Origin
  ctx.fillText('0', midX - 5, midY + 15)
}

onMounted(() => {
  if (!canvasRef.value) return
  
  engine = Matter.Engine.create()
  render = Matter.Render.create({
    canvas: canvasRef.value,
    engine: engine,
    options: {
      width: WIDTH,
      height: HEIGHT,
      wireframes: false,
      background: 'transparent'
    }
  })
  
  // Create only ceiling bounds so ball doesn't bounce UP and OUT.
  Matter.World.add(engine.world, [
    Matter.Bodies.rectangle(WIDTH / 2, -50, WIDTH, 100, { isStatic: true }), // ceiling
  ])
  
  if (gridCanvasRef.value) {
    const gridCtx = gridCanvasRef.value.getContext('2d')
    if (gridCtx) drawGrid(gridCtx)
  }
  
  regenerateBuckets()
  regenerateObstacles()
  
  if (!props.isCommitted) {
      spawnStaticBall()
  }
  
  Matter.Events.on(engine, 'collisionStart', (event) => {
    const pairs = event.pairs
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i]
        if (!pair) continue
        const { bodyA, bodyB } = pair
        
        let bucket = null
        if (bodyA.label.startsWith('bucket_') && bodyB === ball) bucket = bodyA
        if (bodyB.label.startsWith('bucket_') && bodyA === ball) bucket = bodyB
        
        let obstacle = null
        if (bodyA.label === 'obstacle' && bodyB === ball) obstacle = bodyA
        if (bodyB.label === 'obstacle' && bodyA === ball) obstacle = bodyB
        
        if (obstacle) {
            playObstacleBounceSound()
            ;(obstacle as any).hitTime = Date.now()
        }

        if (bucket) {
            (bucket as any).hitTime = Date.now()
            const typeStr = bucket.label.replace('bucket_', '')
            let points = 0
            if (Object.values(BUCKET_TYPES).includes(typeStr as any)) {
                points = BUCKET_POINTS[typeStr as keyof typeof BUCKET_POINTS]
            } else {
                points = parseInt(typeStr, 10)
            }
            
            playScoreSound(points)
            
            Matter.World.remove(engine.world, ball!)
            ball = null
            ballDropTime = null
            emit('ball-result', points)
        }
    }
  })
  
  // Removed beforeRender drawGrid call since it's on a background canvas now
  
  // Render buckets text
  Matter.Events.on(render, 'afterRender', () => {
      const ctx = render.context
      ctx.textAlign = 'center'
      
      obstacleBodies.forEach(b => {
          if ((b as any).hitTime) {
            const sinceHit = Date.now() - (b as any).hitTime
            if (sinceHit < 200) {
              ctx.beginPath()
              ctx.arc(b.position.x, b.position.y, 12, 0, 2 * Math.PI)
              ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, 1 - sinceHit/200)})`
              ctx.fill()
            }
          }
      })

      bucketSensors.forEach(b => {
          const type = b.label.replace('bucket_', '')
          
          if ((b as any).hitTime) {
            const sinceHit = Date.now() - (b as any).hitTime
            if (sinceHit < 500) {
              ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, 1 - sinceHit/500)})`
              ctx.fillRect(b.bounds.min.x, b.bounds.min.y, b.bounds.max.x - b.bounds.min.x, b.bounds.max.y - b.bounds.min.y)
            }
          }

          ctx.fillStyle = '#fff'
          ctx.font = '20px Outfit'
          ctx.fillText(type, b.position.x, b.position.y + 5)
          
          // Draw separator
          ctx.beginPath()
          ctx.moveTo(b.bounds.max.x, HEIGHT - 40)
          ctx.lineTo(b.bounds.max.x, HEIGHT)
          ctx.strokeStyle = 'white'
          ctx.stroke()
      })
      
      if (isDrawingLine && lineAnimationData) {
        const progress = Math.min(1, (Date.now() - lineAnimationData.startTime) / lineAnimationData.duration)
        ctx.beginPath()
        ctx.moveTo(0, lineAnimationData.y0)
        ctx.lineTo(WIDTH * progress, lineAnimationData.y0 + lineAnimationData.dy * progress)
        ctx.strokeStyle = '#ffde59'
        ctx.lineWidth = 10
        ctx.stroke()
      }
  })

  Matter.Render.run(render)
  runner = Matter.Runner.create()
  Matter.Runner.run(runner, engine)
})

onUnmounted(() => {
  Matter.Render.stop(render)
  Matter.Runner.stop(runner)
  Matter.Engine.clear(engine)
})

watch(() => props.isCommitted, (commited) => {
    if (commited && props.m !== undefined && props.b !== undefined) {
        // Spawn line
        const midX = WIDTH / 2
        const midY = HEIGHT / 2
        
        // y = mx + b in cartesian coords
        // In canvas, y goes down. So we must invert y.
        // Screen Y = midY - (m * (Screen X - midX) + b * scale)
        // Let's create a static rectangle representing the line.
        // It should span from x=0 to x=WIDTH
        const y0 = midY - (props.m * (0 - midX) / props.scaleParam * props.scaleParam + props.b * props.scaleParam)
        const y1 = midY - (props.m * (WIDTH - midX) / props.scaleParam * props.scaleParam + props.b * props.scaleParam)
        
        const dx = WIDTH
        const dy = y1 - y0
        const angle = Math.atan2(dy, dx)
        const length = Math.sqrt(dx*dx + dy*dy)
        
        isDrawingLine = true
        lineAnimationData = {
            startTime: Date.now(),
            duration: 1000,
            y0, y1, dx, dy, length, angle
        }
        
        setTimeout(() => {
            isDrawingLine = false
            
            lineBody = Matter.Bodies.rectangle(WIDTH/2, (y0+y1)/2, length, 10, {
                isStatic: true,
                angle: angle,
                render: { fillStyle: '#ffde59' }
            })
            Matter.World.add(engine.world, lineBody)
            
            // Drop ball
            if (ball) {
                const currentPos = { x: ball.position.x, y: ball.position.y }
                Matter.World.remove(engine.world, ball)
                ball = Matter.Bodies.circle(currentPos.x, currentPos.y, 15, {
                    restitution: 0.5,
                    render: { fillStyle: '#ff5e5e' }
                })
                Matter.World.add(engine.world, ball)
                ballDropTime = Date.now()
            }
        }, 1000)
    } else if (!commited) {
        // Remove line/ramp when a new turn/round begins
        if (lineBody) {
            Matter.World.remove(engine.world, lineBody)
            lineBody = null
        }
        isDrawingLine = false
        ballDropTime = null
        regenerateBuckets()
        regenerateObstacles()
        spawnStaticBall()
    }
})

watch(() => props.scaleParam, () => {
    if (gridCanvasRef.value) {
        const gridCtx = gridCanvasRef.value.getContext('2d')
        if (gridCtx) drawGrid(gridCtx)
    }
})

// Physics Check Loop: handles moving ball and fall off screen 
setInterval(() => {
    if (ball) {
        if (!props.isCommitted) {
            // Move ball horizontally
            let nextX = ball.position.x + ballVelocityX
            // Bounce off walls (accounting for radius 15)
            if (nextX < 15) {
                nextX = 15
                ballVelocityX *= -1
            } else if (nextX > WIDTH - 15) {
                nextX = WIDTH - 15
                ballVelocityX *= -1
            }
            Matter.Body.setPosition(ball, { x: nextX, y: ball.position.y })
        } else {
            // Did it fall below, roll far left, or far right?
            let shouldEnd = false;
            if (ball.position.y > HEIGHT || ball.position.x < -20 || ball.position.x > WIDTH + 20) {
                shouldEnd = true;
            } else if (ballDropTime && Date.now() - ballDropTime > 5000) {
                // max roll time: 10 seconds
                shouldEnd = true;
            }

            if (shouldEnd) {
                Matter.World.remove(engine.world, ball)
                ball = null
                ballDropTime = null
                emit('ball-result', 0)
            }
        }
    }
}, 16) // roughly 60fps for smooth movement

</script>

<template>
  <div class="canvas-container">
    <canvas ref="gridCanvasRef" class="grid-layer" :width="WIDTH" :height="HEIGHT"></canvas>
    <canvas ref="canvasRef" class="physics-layer"></canvas>
  </div>
</template>

<style scoped>
.canvas-container {
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  position: relative;
  /* Make container size match canvas */
  min-width: 800px;
  min-height: 600px;
}

.grid-layer, .physics-layer {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
