import type { vec3 } from 'gl-matrix';

import type { Body } from '@/bodies';

import type AABB from './AABB';

export default class SpatialHashGrid {
    public cells: Map<string, Set<Body>> = new Map();

    constructor(protected cellSize: number) {}

    insert(body: Body) {
        const aabb = body.getAABB();
        for (const position of this.cellsForAABB(aabb)) {
            const key = this.getCellKey(position);
            if (!this.cells.has(key)) {
                this.cells.set(key, new Set());
            }
            this.cells.get(key)!.add(body);
            body.cellsKeys.add(key);
        }
    }

    // A simple hash function to get the cell ID
    getCellKey(position: vec3): string {
        const x = Math.floor(position[0] / this.cellSize);
        const y = Math.floor(position[1] / this.cellSize);
        // Combine coordinates into a single string key
        return `${x}_${y}`;
    }

    clear() {
        this.cells.clear();
    }

    protected *cellsForAABB(aabb: AABB) {
        const gx0 = aabb.min[0];
        const gy0 = aabb.min[1];
        const gx1 = aabb.max[0];
        const gy1 = aabb.max[1];

        for (let gy = gy0; gy <= gy1; gy++) {
            for (let gx = gx0; gx <= gx1; gx++) {
                // out.push([gx, gy]);
                yield [gx, gy];
            }
        }
    }
}
