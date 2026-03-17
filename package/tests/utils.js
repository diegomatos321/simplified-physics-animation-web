import { existsSync, mkdirSync, writeFileSync } from 'fs';

import { PolygonBody, RectangleBody, TriangleBody } from '../dist/bodies.js';
export function generateBodies(count, worldDimensions, size) {
    const bodies = [];

    for (let i = 0; i < count; i++) {
        const x = Math.random() * worldDimensions;
        const y = Math.random() * worldDimensions;

        const type = Math.random();
        const isStatic = Math.random() < 0.2 ? true : false;
        let body;
        if (type <= 0.25) {
            body = new TriangleBody(x, y, size, isStatic);
        } else if (type <= 0.5) {
            body = new RectangleBody(x, y, size, size / 2, isStatic);
        } else if (type <= 0.75) {
            body = PolygonBody.PolygonBuilder(x, y, size, 5, isStatic);
        } else {
            body = PolygonBody.PolygonBuilder(x, y, size, 6, isStatic);
        }

        bodies.push(body);
    }

    return bodies;
}

export function exportCSV(metrics, name) {
    const dir = 'tests/results';
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }

    const header =
        'particles,constraints,collisions_test,true_collisions,broadphase_time,narrowphase_time,dt\n';
    let rows = '';
    const rowsCount = metrics.particlesCount.length;
    for (let i = 0; i < rowsCount; i++) {
        rows += `${metrics.particlesCount[i]},${metrics.constraintsCount[i]},${metrics.collisionsTest[i]},${metrics.trueCollisions[i]},${metrics.broadphaseTime[i]},${metrics.narrowphaseTime[i]},${metrics.deltatime[i]}\n`;
    }

    writeFileSync(`${dir}/${name}.csv`, header + rows);
}

// function* cellsForAABB(aabb) {
//     const gx0 = Math.floor(aabb.min[0] / this.cellSize);
//     const gy0 = Math.floor(aabb.min[1] / this.cellSize);
//     const gx1 = Math.floor(aabb.max[0] / this.cellSize);
//     const gy1 = Math.floor(aabb.max[1] / this.cellSize);

//     for (let gy = gy0; gy <= gy1; gy++) {
//         for (let gx = gx0; gx <= gx1; gx++) {
//             yield [gx, gy];
//         }
//     }
// }
