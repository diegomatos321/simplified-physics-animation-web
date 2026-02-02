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
            <h1 class="text-3xl"><strong>Tecido e Treliças</strong></h1>
        </div>

        <div class="w-full flex flex-col md:flex-row gap-6">
            <div class="md:w-2/3" ref="sketchContainer"></div>
            <div class="md:w-1/3 border border-slate-200 rounded p-4 space-y-2">
                <div class="flex justify-between">
                    <p>FPS</p>
                    <p>{{ fps }}</p>
                </div>
                <div class="flex justify-between">
                    <p>Entities</p>
                    <p>{{ totalEntities }}</p>
                </div>
                <div class="flex justify-between">
                    <p>Particles</p>
                    <p>{{ getParticlesCount() }}</p>
                </div>
                <div class="flex justify-between">
                    <p>Constraints</p>
                    <p>{{ getConstraintsCount() }}</p>
                </div>
                <div class="flex justify-between">
                    <p>Collision Tests</p>
                    <p>{{ getCollisionsCount() }}</p>
                </div>

                <hr class="my-4 border-slate-200" />
                <div class="flex justify-between">
                    <label for="threaded">Threaded Mode</label>
                    <input id="threaded" name="threaded" type="checkbox" v-model="threaded" />
                </div>

                <!-- <div class="flex justify-between">
                    <label for="pauseOnCollision">Pause on Collision</label>
                    <input id="pauseOnCollision" name="pauseOnCollision" type="checkbox" v-bind:value="engine.pauseOnCollision" @click="OnPauseCollisionBtn" />
                </div> -->

                <div class="flex justify-between">
                    <label for="broadPhaseMode">Broad Phase</label>
                    <select style="max-width: 100px" name="broadPhaseMode" id="broadPhaseMode" class="border border-slate-200 rounded">
                        <option value="gridSpatialPartition">Grid Spatial Partition</option>
                        <option value="naive">Naive</option>
                    </select>
                </div>

                <div class="flex justify-between">
                    <label for="collisionDetectionMode">Collision Detection</label>
                    <select style="max-width: 100px" name="collisionDetectionMode" id="collisionDetectionMode" class="border border-slate-200 rounded">
                        <option value="gjk">GJK/EPA</option>
                        <option value="sat">Sat</option>
                    </select>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import p5 from 'p5';
import { vec3 } from 'gl-matrix';
import { PolygonBody, TrellisBody } from '@devdiegomatos/liso-engine/bodies';
import { Engine, BroadPhaseMode, CollisionDetectionMode } from '@devdiegomatos/liso-engine';
import { createEngineWorker, ObjectType, type MainToWorkerMessage, type ObjectBuilderArgs, type WorkerToMainMessage } from '@devdiegomatos/liso-engine/worker';
import Scene from '@/scenes/Scene';
import type IScene from '@/scenes/IScene';
import SceneThreaded from '@/scenes/SceneThreaded';

// Component States
let hasStarted = false;
const totalEntities = 4;
const threaded = false;
const fps = ref(0);

// Main thread mode variables
const worldBoundings = 600;
const gridSize = 40;
let scene: IScene | null = null;

// Threaded mode variables
let worker: Worker | null = null;

// P5 variables
const sketchContainer = ref<HTMLDivElement | null>(null);
let sketchInstance: p5 | null = null;

onMounted(() => {
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
});

async function setup(p: p5) {
    if (sketchContainer.value === null) return;

    p.createCanvas(worldBoundings, worldBoundings).parent(sketchContainer.value);

    if (threaded && worker) {
        const objects: ObjectBuilderArgs[] = [];

        const trelis1: ObjectBuilderArgs = {
            type: ObjectType.Trellis,
            x: 130,
            y: 200,
            width: 100,
            height: 100,
            nx: 4,
            ny: 4,
            reinforce: true,
        };

        const trelis2: ObjectBuilderArgs = {
            type: ObjectType.Trellis,
            x: 100,
            y: 450,
            width: 200,
            height: 100,
            nx: 3,
            ny: 2,
            reinforce: true,
        };

        const cloth: ObjectBuilderArgs = {
            type: ObjectType.Trellis,
            x: 250,
            y: 200,
            width: 100,
            height: 100,
            nx: 10,
            ny: 10,
        };

        const pentagonPoly: ObjectBuilderArgs = {
            type: ObjectType.Polygon,
            x: 200,
            y: 50,
            size: 100,
            k: 5,
        };

        objects.push(trelis1, trelis2, cloth, pentagonPoly);
        const msg: MainToWorkerMessage = {
            type: 'start',
            config: {
                worldBoundings: {
                    top: [0, 0],
                    right: [worldBoundings, worldBoundings],
                },
                BroadPhase: BroadPhaseMode.GridSpatialPartition,
                CollisionDetection: CollisionDetectionMode.GjkEpa,
                gravity: vec3.fromValues(0, 98, 0),
                gridSize,
            },
            objects,
        };
        worker.postMessage(msg);
    } else {
        scene = new Scene(
            new Engine({
                worldBoundings: {
                    top: [0, 0],
                    right: [worldBoundings, worldBoundings],
                },
                BroadPhase: BroadPhaseMode.GridSpatialPartition,
                CollisionDetection: CollisionDetectionMode.GjkEpa,
                gravity: vec3.fromValues(0, 98, 0),
                gridSize,
            }),
        );

        const trelis1 = new TrellisBody(vec3.fromValues(130, 200, 0), vec3.fromValues(100, 100, 0), 4, 4, true, true);
        trelis1.particles[0].isStatic = true;
        scene.add(trelis1);
        // trelis1.particles[10].isStatic = true;
        // engine.addBody(trelis1);
        // entities.push(trelis1);

        const trelis2 = new TrellisBody(vec3.fromValues(100, 450, 0), vec3.fromValues(200, 100, 0), 3, 2, true);
        scene.add(trelis2);
        // engine.addBody(trelis2);
        // entities.push(trelis2);

        const cloth = new TrellisBody(vec3.fromValues(250, 200, 0), vec3.fromValues(100, 100, 0), 10, 10);
        cloth.particles[0].isStatic = true;
        cloth.particles[10].isStatic = true;
        scene.add(cloth);
        // engine.addBody(cloth);
        // entities.push(cloth);

        const pentagonPoly = PolygonBody.PolygonBuilder(200, 50, 100, 5);
        scene.add(pentagonPoly);
        // engine.addBody(pentagonPoly);
        // entities.push(pentagonPoly);
    }
}

function loop(p: p5) {
    if (!scene) return;

    p.background('#ffffff');

    // Draw grid
    p.push();
    p.stroke('#e0e0e0');
    p.strokeWeight(1);

    // linhas verticais
    for (let x = 0; x <= p.width; x += gridSize) {
        p.line(x + 0.5, 0, x + 0.5, p.height); // 0.5 corrige artefatos de subpixel
    }

    // linhas horizontais
    for (let y = 0; y <= p.height; y += gridSize) {
        p.line(0, y + 0.5, p.width, y + 0.5);
    }

    p.pop();

    fps.value = Math.round(p.frameRate());

    scene.step(p.deltaTime / 1000);
    scene.render(p);
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
});

function getParticlesCount() {
    if (!scene) {
        return 0;
    }

    return scene.getParticlesCount();
}

function getConstraintsCount() {
    if (!scene) {
        return 0;
    }

    return scene.getConstraintsCount();
}

function getCollisionsCount() {
    if (!scene) {
        return 0;
    }

    return scene.getCollisionsCount();
}

function OnWorkerEvent(e: MessageEvent<WorkerToMainMessage>) {
    if (!scene || !(scene instanceof SceneThreaded)) return;

    const msg = e.data;
    if (msg.type === 'simulation_state') {
        scene.simulation_state = msg.state;
    }
}
</script>
