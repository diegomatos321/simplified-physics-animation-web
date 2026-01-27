import { vec3 } from 'gl-matrix';
import { describe, it, test } from 'vitest';

import Engine, {
    BroadPhaseMode,
    CollisionDetectionMode,
} from '../../src/Engine';
import * as utils from '../utils';

describe('Collision detection - load test', () => {
    const testCases = [
        {
            worldBoudings: 1000,
            objects: 100
        },
        {
            worldBoudings: 2000,
            objects: 1000
        },
        {
            worldBoudings: 6000,
            objects: 10_000
        },
    ]

    it('runs performance tests on naive mode and exports CSV', () => {
        for (const testCase of testCases) {
            console.log(`Teste com ${testCase.objects} objetos`)

            const engine = new Engine({
                worldBoundings: {
                    top: [0, 0],
                    right: [testCase.worldBoudings, testCase.worldBoudings],
                },
                BroadPhase: BroadPhaseMode.GridSpatialPartition,
                CollisionDetection: CollisionDetectionMode.GjkEpa,
                gravity: vec3.fromValues(0, 0, 0),
                gridSize: 50,
            });

            const bodies = utils.generateBodies(testCase.objects, testCase.worldBoudings, 50);
            for (const body of bodies) {
                engine.addBody(body);
            }

            for (let i = 0; i < 60; i++) {
                engine.step(1 / 60);
            }

            utils.exportCSV(
                engine.metrics,
                `collision-test-grid-mode-${testCase.objects}-objects`,
            );
        }
    });
});
