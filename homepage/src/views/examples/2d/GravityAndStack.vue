<style>
canvas {
    border-radius: 12px;
    width: 100% !important;
    height: 100% !important;
}
</style>

<template>
    <div style="max-width: 1000px" class="mx-auto space-y-4">
        <div>
            <h1 class="text-3xl"><strong>Gravity and Stack</strong></h1>
            <p>Click to spawn a random Polygon</p>
        </div>

        <div class="w-full flex flex-col md:flex-row gap-6">
            <div class="md:w-2/3" ref="sketchContainer"></div>
            <div class="md:w-1/3 border border-slate-200 rounded p-4 space-y-2">
                <div class="flex justify-between">
                    <p>FPS</p>
                    <p>{{ fps }}</p>
                </div>
                <div class="flex justify-between">
                    <label for="totalEntities">Entities</label>
                    <p>{{ totalEntities }}</p>
                </div>
                <div class="flex justify-between">
                    <p>Particles</p>
                    <!-- <p>{{ engine.particlesCount }}</p> -->
                </div>
                <div class="flex justify-between">
                    <p>Constraints</p>
                    <!-- <p>{{ engine.constraintsCount }}</p> -->
                </div>
                <div class="flex justify-between">
                    <p>Collision Tests</p>
                    <!-- <p>{{ engine.collisionsTests }}</p> -->
                </div>

                <hr class="my-4 border-slate-200" />
                <div class="flex justify-between">
                    <label for="threaded">Threaded Mode</label>
                    <input id="threaded" name="threaded" type="checkbox" v-model="threaded" />
                </div>

                <div class="flex justify-between">
                    <label for="pauseOnCollision">Pause on Collision</label>
                    <input id="pauseOnCollision" name="pauseOnCollision" type="checkbox" v-model="engine.pauseOnCollision" @click="OnPauseCollisionBtn" />
                </div>

                <div class="flex justify-between">
                    <label for="broadPhaseMode">Broad Phase</label>
                    <select
                        style="max-width: 100px"
                        name="broadPhaseMode"
                        id="broadPhaseMode"
                        v-model="engine.config.BroadPhase"
                        class="border border-slate-200 rounded"
                    >
                        <option value="0">Naive</option>
                        <option value="1">Grid Spatial Partition</option>
                    </select>
                </div>

                <div class="flex justify-between">
                    <label for="collisionDetectionMode">Collision Detection</label>
                    <select
                        style="max-width: 100px"
                        name="collisionDetectionMode"
                        id="collisionDetectionMode"
                        v-model="engine.config.CollisionDetection"
                        class="border border-slate-200 rounded"
                    >
                        <option value="0">GJK/EPA</option>
                        <option value="1">Sat</option>
                    </select>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import p5 from 'p5';
import { type Body, PolygonBody, TriangleBody, RectangleBody } from '@devdiegomatos/liso-engine/bodies';
import { Engine, BroadPhaseMode, CollisionDetectionMode } from '@devdiegomatos/liso-engine';
import { vec3 } from 'gl-matrix';
import {
    createEngineWorker,
    ObjectType,
    type MainToWorkerMessage,
    type ObjectBuilderArgs,
    type SimulationState,
    type WorkerToMainMessage,
} from '@devdiegomatos/liso-engine/worker';

// Component States
let hasStarted = false;
const totalEntities = 0;
const fps = ref(0);
const threaded = false;

// Main thread mode variables
const engine = new Engine({
    worldBoundings: {
        top: [0, 0],
        right: [600, 600],
    },
    BroadPhase: BroadPhaseMode.GridSpatialPartition,
    CollisionDetection: CollisionDetectionMode.GjkEpa,
    gravity: vec3.fromValues(0, 98, 0),
    gridSize: 40,
});
const entities: Body[] = [];

// Threaded mode variables
let worker: Worker | null = null;
let simulation_state: SimulationState = {
    objects: [],
    collidersInfo: [],
    particlesCount: 0,
    constraintsCount: 0,
    collisionsTests: 0,
};

// P5 variables
const sketchContainer = ref<HTMLDivElement | null>(null);
let sketchInstance: p5 | null = null;

onMounted(() => {
    if (!sketchContainer.value || hasStarted) return;

    start();
});

function start() {
    if (!sketchContainer.value || hasStarted) return;

    hasStarted = true;

    if (sketchInstance === null) {
        const sketch = (p: p5) => {
            p.setup = () => setup(p);
            p.draw = () => loop(p);
        };

        sketchInstance = new p5(sketch);
    }

    if (threaded) {
        worker = createEngineWorker();
        worker.addEventListener('message', OnWorkerEvent);
    }

    window.addEventListener('keydown', handleKeyDown);
    sketchContainer.value.addEventListener('pointerdown', handlePointerDown);
}

async function setup(p: p5) {
    if (sketchContainer.value === null) return;

    p.createCanvas(600, 600).parent(sketchContainer.value);

    if (threaded && worker) {
        const objects: ObjectBuilderArgs[] = [];
        objects.push({
            type: ObjectType.Rectangle,
            x: 300,
            y: 550,
            width: 450,
            height: 50,
            isStatic: true,
        });

        const msg: MainToWorkerMessage = {
            type: 'start',
            config: {
                worldBoundings: {
                    top: [0, 0],
                    right: [600, 600],
                },
                BroadPhase: BroadPhaseMode.GridSpatialPartition,
                CollisionDetection: CollisionDetectionMode.GjkEpa,
                gravity: vec3.fromValues(0, 0, 0),
                gridSize: 40,
            },
            objects,
        };
        worker.postMessage(msg);
    } else {
        const body = new RectangleBody(300, 550, 450, 50, true);
        engine.addBody(body);
        entities.push(body);
    }
}

function loop(p: p5) {
    p.background('#ffffff');

    // Draw grid
    p.push();
    p.stroke('#e0e0e0');
    p.strokeWeight(1);

    // linhas verticais
    for (let x = 0; x <= p.width; x += 40) {
        p.line(x + 0.5, 0, x + 0.5, p.height); // 0.5 corrige artefatos de subpixel
    }

    // linhas horizontais
    for (let y = 0; y <= p.height; y += 40) {
        p.line(0, y + 0.5, p.width, y + 0.5);
    }

    p.pop();

    fps.value = Math.round(p.frameRate());

    if (threaded) {
        Render_Threaded(p);
    } else {
        engine.step(p.deltaTime / 1000);

        Render_MainThread(p);
    }
}

onBeforeUnmount(() => {
    console.log('Clean up');

    if (sketchInstance) {
        sketchInstance.remove();
        sketchInstance = null;
    }

    if (worker) {
        worker.removeEventListener('message', OnWorkerEvent);
        worker.terminate();
        worker = null;
    }

    window.removeEventListener('keydown', handleKeyDown);
    sketchContainer.value?.removeEventListener('pointerdown', handlePointerDown);
});

function Render_Threaded(p: p5) {
    // Batch draw all constraints as lines
    p.stroke(0, 0, 0);
    p.strokeWeight(1);
    p.beginShape(p.LINES);
    for (const obj of simulation_state.objects) {
        if (obj.isStatic) {
            continue;
        }
        for (const ci of obj.constraintsIndices) {
            const x0 = obj.particles[ci * 2];
            const y0 = obj.particles[ci * 2 + 1];
            p.vertex(x0, y0);
        }
    }
    p.endShape();

    // Batch draw all constraints of static particles in red
    p.stroke(255, 0, 0);
    p.strokeWeight(1);
    p.beginShape(p.LINES);
    for (const obj of simulation_state.objects) {
        if (obj.isStatic === false) {
            continue;
        }
        for (const ci of obj.constraintsIndices) {
            const x0 = obj.particles[ci * 2];
            const y0 = obj.particles[ci * 2 + 1];
            p.vertex(x0, y0);
        }
    }
    p.endShape();

    // Batch draw all convex hull in blue
    p.stroke(150, 200, 255);
    p.strokeWeight(1);
    p.beginShape(p.LINES);
    for (const colliderInfo of simulation_state.collidersInfo) {
        // convex hull layout: x0, y0, x1, y1, x2, y2, ...
        const totalParticles = colliderInfo.convexHull.length / 2;
        for (let i = 0; i < totalParticles; i++) {
            const x0 = colliderInfo.convexHull[i * 2];
            const y0 = colliderInfo.convexHull[i * 2 + 1];
            p.vertex(x0, y0);

            const j = (i + 1) * 2; // next particle indice
            const x1 = colliderInfo.convexHull[j % colliderInfo.convexHull.length];
            const y1 = colliderInfo.convexHull[(j + 1) % colliderInfo.convexHull.length];
            p.vertex(x1, y1);
        }
    }
    p.endShape();

    // Batch draw all contact points in red
    p.stroke(255, 0, 0);
    p.strokeWeight(2);
    p.beginShape(p.POINTS);
    for (const colliderInfo of simulation_state.collidersInfo) {
        // Draw the contact points
        for (let i = 0; i < colliderInfo.contactPoints.length; i += 2) {
            const x0 = colliderInfo.contactPoints[i];
            const y0 = colliderInfo.contactPoints[i + 1];
            p.vertex(x0, y0);
        }
    }
    p.endShape();
}

function Render_MainThread(p: p5) {
    // Batch draw all constraints as lines
    p.stroke(0, 0, 0);
    p.strokeWeight(1);
    p.beginShape(p.LINES);
    for (const entity of entities) {
        for (const constraint of entity.constraints) {
            p.vertex(constraint.p0.position[0], constraint.p0.position[1]);
            p.vertex(constraint.p1.position[0], constraint.p1.position[1]);
        }
    }
    p.endShape();

    // Batch draw all convex hull in blue
    p.stroke(150, 200, 255);
    p.strokeWeight(1);
    p.beginShape(p.LINES);
    for (const colliderInfo of engine.collidersInfo) {
        const body = colliderInfo.body;
        const convexHull = body.convexHull();

        for (let i = 0; i < convexHull.particles.length; i++) {
            const v1 = convexHull.particles[i];
            const v2 = convexHull.particles[(i + 1) % convexHull.particles.length];
            p.vertex(v1.position[0], v1.position[1]);
            p.vertex(v2.position[0], v2.position[1]);
        }
    }
    p.endShape();

    // Batch draw all contact points in red
    p.stroke(255, 0, 0);
    p.strokeWeight(2);
    p.beginShape(p.POINTS);
    for (const colliderInfo of engine.collidersInfo) {
        // Draw the contact points and normal direction
        for (const particle of colliderInfo.contactPoints) {
            p.vertex(particle.position[0], particle.position[1]);
        }
    }
    p.endShape();

    // Batch draw all separation normals in red
    p.stroke(255, 0, 0);
    p.strokeWeight(1);
    p.beginShape(p.LINES);
    for (const colliderInfo of engine.collidersInfo) {
        for (const particle of colliderInfo.contactPoints) {
            const delta = vec3.scale(vec3.create(), colliderInfo.normal, 5);
            const p2 = vec3.add(vec3.create(), particle.position, delta);
            p.vertex(particle.position[0], particle.position[1]);
            p.vertex(p2[0], p2[1]);
        }
    }
    p.endShape();
}

function OnPauseCollisionBtn() {
    if (threaded) {
    } else {
        engine.pauseOnCollision = !engine.pauseOnCollision;
    }
}

function handleKeyDown(e: KeyboardEvent) {
    if (e.code == 'Space') {
        if (threaded) {
        } else {
            engine.isPaused = !engine.isPaused;
            engine.skip = !engine.skip;
        }
    }
}

function handlePointerDown(e: PointerEvent) {
    if (sketchContainer.value === null) {
        return;
    }

    const containerRect = sketchContainer.value?.getBoundingClientRect();
    const x = e.clientX - containerRect?.left;
    const y = e.clientY - containerRect?.top;
    const type = Math.random();
    const size = 40;

    if (threaded && worker) {
        let obj: ObjectBuilderArgs;
        if (type <= 0.25) {
            obj = { type: ObjectType.Triangle, x, y, size, isStatic: false };
        } else if (type <= 0.5) {
            obj = { type: ObjectType.Rectangle, x, y, width: size, height: size / 2, isStatic: false };
        } else if (type <= 0.75) {
            obj = { type: ObjectType.Polygon, x, y, size, k: 5, isStatic: false };
        } else {
            obj = { type: ObjectType.Polygon, x, y, size, k: 6, isStatic: false };
        }

        const msg: MainToWorkerMessage = {
            type: 'add_body',
            obj,
        };
        worker.postMessage(msg);
    } else {
        let body;
        if (type <= 0.25) {
            body = new TriangleBody(x, y, size);
        } else if (type <= 0.5) {
            body = new RectangleBody(x, y, size, size / 2);
        } else if (type <= 0.75) {
            body = PolygonBody.PolygonBuilder(x, y, size, 5);
        } else {
            body = PolygonBody.PolygonBuilder(x, y, size, 6);
        }
        engine.addBody(body);
        entities.push(body);
    }
}

function OnWorkerEvent(e: MessageEvent<WorkerToMainMessage>) {
    const msg = e.data;
    if (msg.type === 'simulation_state') {
        simulation_state = msg.state;
    }
}
</script>
