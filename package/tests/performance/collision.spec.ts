import { vec3 } from 'gl-matrix';
import { describe, it } from 'vitest';

import Engine, {
    BroadPhaseMode,
    CollisionDetectionMode,
} from '../../src/Engine';
import * as utils from '../utils';

const testCases = [
    {
        objects: 100,
        worldBoundings: 1000,
        broadPhaseMode: BroadPhaseMode.GridSpatialPartition,
        collisionDetection: CollisionDetectionMode.GjkEpa,
    },
    {
        objects: 1000,
        worldBoundings: 1000,
        broadPhaseMode: BroadPhaseMode.GridSpatialPartition,
        collisionDetection: CollisionDetectionMode.Sat,
    },
    {
        objects: 10000,
        worldBoundings: 1000,
        broadPhaseMode: BroadPhaseMode.GridSpatialPartition,
        collisionDetection: CollisionDetectionMode.Sat,
    },
];

describe('Collision detection – load experiment', () => {
    for (let i = 0; i < testCases.length; i++) {
        it(`Starting test ${i}`, () => {
            const testCase = testCases[i];

            const gridArea = testCase.worldBoundings ** 2;
            const gridSize = Math.sqrt(gridArea / (testCase.objects * 5));

            const engine = new Engine({
                worldBoundings: {
                    top: [0, 0],
                    right: [testCase.worldBoundings, testCase.worldBoundings],
                },
                BroadPhase: testCase.broadPhaseMode,
                CollisionDetection: testCase.collisionDetection,
                gravity: vec3.fromValues(0, 0, 0),
                gridSize,
            });

            const bodies = utils.generateBodies(
                testCase.objects,
                testCase.worldBoundings,
                gridSize,
            );
            for (const body of bodies) {
                engine.addBody(body);
            }

            for (let i = 0; i < 60 * 3; i++) {
                engine.step(1 / 60);
            }

            const now = new Date();
            let filename = 'collision-test';
            if (testCase.broadPhaseMode === BroadPhaseMode.Naive) {
                filename += '-naive-mode';
            } else if (
                testCase.broadPhaseMode === BroadPhaseMode.GridSpatialPartition
            ) {
                filename += '-grid-mode';
            }
            filename += `-${testCase.objects}-objects-${now.toISOString()}`;

            utils.exportCSV(engine.metrics, filename);
        });
    }
});
