import { vec3 } from 'gl-matrix';

import type Body from './bodies/Body';
import ColliderInfo from './core/ColliderInfo';
import { epa } from './core/collision/epa';
import gjk from './core/collision/gjk';
import sat from './core/collision/sat';
import GridSpatialPartition from './core/GridSpatialPartition';
import SpatialHashGrid from './core/SpatialHashGrid';

export enum BroadPhaseMode {
    Naive,
    GridSpatialPartition,
}

export enum CollisionDetectionMode {
    GjkEpa,
    Sat,
}

export interface Config {
    worldBoundings: { top: [number, number]; right: [number, number] };
    BroadPhase: BroadPhaseMode;
    CollisionDetection: CollisionDetectionMode;
    gravity: vec3;
    gridSize: number;
}

export default class Engine {
    public gravity: vec3;

    public bodies: Body[] = [];
    public contactPairs: [Body, Body][] = [];
    public collidersInfo: ColliderInfo[] = [];

    // Debug states
    public isPaused: boolean = false;
    public pauseOnCollision: boolean = false;
    public skip: boolean = false;
    public particlesCount: number = 0;
    public constraintsCount: number = 0;
    public collisionsTests: number = 0;

    // protected spatialPartition: GridSpatialPartition = new GridSpatialPartition(
    //     0,
    //     0,
    //     1,
    // );
    protected spatialHashGrid: SpatialHashGrid;
    protected NUM_ITERATIONS: number = 3;

    constructor(public config: Config) {
        if (config.BroadPhase == BroadPhaseMode.GridSpatialPartition) {
            const worldWidth =
                config.worldBoundings.right[0] - config.worldBoundings.top[0];
            const worldHeight =
                config.worldBoundings.right[1] - config.worldBoundings.top[1];
            // this.spatialPartition = new GridSpatialPartition(
            //     worldWidth,
            //     worldHeight,
            //     config.gridSize,
            // );
            this.spatialHashGrid = new SpatialHashGrid(config.gridSize);
        }

        this.gravity = config.gravity;
    }

    step(dt: number) {
        if (this.isPaused) {
            return;
        }

        // Reset engine states
        this.particlesCount = 0;
        this.constraintsCount = 0;
        this.collisionsTests = 0;
        this.contactPairs.length = 0;
        this.collidersInfo.length = 0;

        if (this.config.BroadPhase == BroadPhaseMode.GridSpatialPartition) {
            // this.spatialPartition.clear();
            this.spatialHashGrid.clear();
        }

        for (const body of this.bodies) {
            this.particlesCount += body.particles.length;
            this.constraintsCount += body.constraints.length;

            // Invalidate caches
            body.aabb = null;
            body._convexHull = null;

            this.integrate(body, dt);

            if (this.config.BroadPhase == BroadPhaseMode.GridSpatialPartition) {
                // this.spatialPartition.insert(body);
                body._cellKey.length = 0;
                this.spatialHashGrid.insert(body);
            }
        }

        if (this.config.BroadPhase == BroadPhaseMode.GridSpatialPartition) {
            this.broadPhase_GridSpatialPartition();
        } else {
            this.broadPhase_Naive();
        }

        if (this.config.CollisionDetection == CollisionDetectionMode.Sat) {
            this.narrowPhase_SAT();
        } else if (
            this.config.CollisionDetection == CollisionDetectionMode.GjkEpa
        ) {
            this.narrowPhase_GJK();
        }

        this.resolveCollisions();

        for (const body of this.bodies) {
            this.satisfyConstraints(body);
        }

        this.skip = false;
    }

    /**
     * Jakobson's particle phsyics through verlet integration
     * @param body
     * @returns
     */
    integrate(body: Body, dt: number) {
        for (const particle of body.particles) {
            if (particle.isStatic) continue;

            const velocity = vec3.subtract(
                vec3.create(),
                particle.position,
                particle.oldPosition,
            );
            vec3.copy(particle.oldPosition, particle.position);

            const drag = vec3.fromValues(
                -10 * velocity[0],
                -10 * velocity[1],
                0,
            );
            const acc = vec3.add(vec3.create(), drag, this.gravity);
            vec3.scale(acc, acc, dt * dt);

            // pos = pos + velocity + acc
            vec3.add(particle.position, particle.position, velocity);
            vec3.add(particle.position, particle.position, acc);
        }
    }

    /**
     * Jakobson's constraints solver
     * @param body
     * @returns
     */
    satisfyConstraints(body: Body) {
        for (let i = 0; i < this.NUM_ITERATIONS; i++) {
            for (const particle of body.particles) {
                const x = Math.max(
                    Math.min(
                        particle.position[0],
                        this.config.worldBoundings.right[0],
                    ),
                    this.config.worldBoundings.top[0],
                );
                const y = Math.max(
                    Math.min(
                        particle.position[1],
                        this.config.worldBoundings.right[1],
                    ),
                    this.config.worldBoundings.top[1],
                );
                vec3.set(particle.position, x, y, 0);
            }

            for (const constraint of body.constraints) {
                constraint.relax();
            }
        }
    }

    public broadPhase_GridSpatialPartition() {
        const seen = new Set<string>();
        for (const bodyA of this.bodies) {
            for (const cellKey of bodyA._cellKey) {
                const candidates = this.spatialHashGrid.cells[cellKey];
                for (const bodyB of candidates) {
                    const idA = bodyA.id;
                    const idB = bodyB.id;
                    const keyPair =
                        idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
                    if (idA === idB || seen.has(keyPair)) {
                        continue;
                    }

                    seen.add(keyPair);

                    const boundingBoxA = bodyA.getAABB();
                    const boundingBoxB = bodyB.getAABB();

                    this.collisionsTests += 1;
                    if (boundingBoxA.intersects(boundingBoxB)) {
                        this.contactPairs.push([bodyA, bodyB]);
                    }
                }
            }
        }
        // const seen = new Set<string>();

        // for (const bodyA of this.bodies) {
        //     const candidates = this.spatialPartition.query(bodyA.getAABB());

        //     for (const bodyB of candidates) {
        //         const idA = bodyA.id;
        //         const idB = bodyB.id;
        //         const keyPair = idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
        //         if (idA === idB || seen.has(keyPair)) {
        //             continue;
        //         }

        //         seen.add(keyPair);

        //         const boundingBoxA = bodyA.getAABB();
        //         const boundingBoxB = bodyB.getAABB();

        //         this.collisionsTests += 1;
        //         if (boundingBoxA.intersects(boundingBoxB)) {
        //             this.contactPairs.push([bodyA, bodyB]);
        //         }
        //     }
        // }
    }

    public broadPhase_Naive() {
        for (let i = 0; i < this.bodies.length - 1; i++) {
            const bodyA = this.bodies[i];

            for (let j = i + 1; j < this.bodies.length; j++) {
                const bodyB = this.bodies[j];

                const boundingBoxA = bodyA.getAABB();
                const boundingBoxB = bodyB.getAABB();

                this.collisionsTests += 1;
                if (boundingBoxA.intersects(boundingBoxB)) {
                    this.contactPairs.push([bodyA, bodyB]);
                }
            }
        }
    }

    public narrowPhase_SAT() {
        for (const pair of this.contactPairs) {
            const bodyA = pair[0];
            const bodyB = pair[1];

            const convexHullA = bodyA.convexHull();
            const convexHullB = bodyB.convexHull();

            // The direction of the separation plane goes from A to B
            // So the separation required for A is in the oppositive direction
            this.collisionsTests += 1;
            const hit = sat(convexHullA, convexHullB);
            if (hit) {
                const colliderA = new ColliderInfo(
                    bodyA,
                    vec3.negate(vec3.create(), hit.normal),
                    hit.depth,
                );
                const colliderB = new ColliderInfo(
                    bodyB,
                    hit.normal,
                    hit.depth,
                );
                this.collidersInfo.push(colliderA, colliderB);
            }
        }
    }

    public narrowPhase_GJK() {
        for (const pair of this.contactPairs) {
            const bodyA = pair[0];
            const bodyB = pair[1];

            const convexHullA = bodyA.convexHull();
            const convexHullB = bodyB.convexHull();

            // The direction of the separation plane goes from A to B!
            // So the separation required for A is in the oppositive direction
            this.collisionsTests += 1;
            const hit = gjk(convexHullA, convexHullB);
            if (hit) {
                const mvp = epa(convexHullA, convexHullB, hit);
                const colliderA = new ColliderInfo(
                    bodyA,
                    vec3.negate(vec3.create(), mvp.normal),
                    mvp.depth,
                );
                const colliderB = new ColliderInfo(
                    bodyB,
                    mvp.normal,
                    mvp.depth,
                );
                this.collidersInfo.push(colliderA, colliderB);
            }
        }
    }

    public resolveCollisions() {
        for (const c of this.collidersInfo) {
            // The separation direction is pointing away from the colliding points
            // We should look for the contact edges on the oppositive direction
            const convexHull = c.body.convexHull();
            const edge = convexHull.getFarthestEdgeInDirection(
                vec3.negate(vec3.create(), c.normal),
            );
            c.contactPoints = edge.filter((p) => p.isStatic === false);
            // c.contactPoints = edge;

            if (this.pauseOnCollision && this.skip === false) {
                this.isPaused = true;
                // Should not resolve collision, just pause the simulation
                // however you need to calculate all the contact points for
                // rendering debug
                continue;
            }

            for (const particle of c.contactPoints) {
                if (particle.isStatic) {
                    continue;
                }

                const correction = vec3.scale(
                    vec3.create(),
                    c.normal,
                    c.depth / c.contactPoints.length,
                );
                vec3.scale(correction, correction, 1 / particle.mass);

                particle.move(correction);
            }
            // console.log(c);
        }
    }

    public addBody(body: Body) {
        this.bodies.push(body);
        this.spatialPartition.insert(body);
    }
}
