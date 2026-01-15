import type Body from '../bodies/Body';
import type AABB from './AABB';

export default class GridSpatialPartition {
    // Uso de set para evitar duplicação DENTRO da célula.
    public grid: Set<Body>[][] = [];
    public readonly nrows: number;
    public readonly ncols: number;

    constructor(
        worldWidth: number,
        worldHeight: number,
        protected cellsize: number,
    ) {
        if (cellsize <= 0) throw new Error('cellsize must be > 0');

        this.nrows = Math.ceil(worldHeight / cellsize);
        this.ncols = Math.ceil(worldWidth / cellsize);
        for (let r = 0; r < this.nrows; r++) {
            const row: Set<Body>[] = [];
            for (let c = 0; c < this.ncols; c++) {
                row.push(new Set<Body>());
            }
            this.grid.push(row);
        }
    }

    public insert(body: Body): void {
        const aabb = body.getAABB();
        // const cells = this.cellsForAABB(aabb);
        for (const [gx, gy] of this.cellsForAABB(aabb)) {
            const cell = this.grid[gy][gx];
            cell.add(body);
        }
    }

    public query(aabb: AABB): Set<Body> {
        const resultSet = new Set<Body>();
        // const cells = this.cellsForAABB(aabb);

        for (const [gx, gy] of this.cellsForAABB(aabb)) {
            const cell = this.grid[gy][gx];
            for (const body of cell) {
                resultSet.add(body);
            }
        }

        return resultSet;
    }

    public clear() {
        // esvazia sets e o map
        for (let r = 0; r < this.nrows; r++) {
            for (let c = 0; c < this.ncols; c++) {
                this.grid[r][c].clear();
            }
        }
    }

    protected *cellsForAABB(aabb: AABB) {
        const gx0 = Math.floor(aabb.min[0] / this.cellsize);
        const gy0 = Math.floor(aabb.min[1] / this.cellsize);
        const gx1 = Math.floor(aabb.max[0] / this.cellsize);
        const gy1 = Math.floor(aabb.max[1] / this.cellsize);

        for (let gy = gy0; gy <= gy1; gy++) {
            for (let gx = gx0; gx <= gx1; gx++) {
                if (gx < 0 || gx >= this.ncols || gy < 0 || gy >= this.nrows) {
                    continue;
                }
                // out.push([gx, gy]);
                yield [gx, gy];
            }
        }
    }
}
