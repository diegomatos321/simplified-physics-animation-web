import { vec3 } from 'gl-matrix';

import type IConstraint from '../core/constraints/IConstraint';
import LinearConstraint from '../core/constraints/LinearConstraint';
import Particle from '../core/Particle';
import Body from './Body';
import PolygonBody from './PolygonBody';

export default class TrellisBody extends Body {
    constructor(
        corner: vec3,
        size: vec3,
        protected nx: number,
        protected ny: number,
        stiff: boolean = false,
        reinforce: boolean = false,
    ) {
        const particles: Particle[] = [];
        const constraints: IConstraint[] = [];
        const constraintsIndices: number[] = [];

        const dx = vec3.fromValues(size[0] / nx, 0, 0);
        const dy = vec3.fromValues(0, size[1] / ny, 0);

        const m = nx + 1;
        for (let i = 0; i <= ny; i++) {
            const q = vec3.scaleAndAdd(vec3.create(), corner, dy, i);
            for (let j = 0; j <= nx; j++) {
                const p = vec3.scaleAndAdd(vec3.create(), q, dx, j);
                particles.push(new Particle(p));

                const k = i * m + j;
                if (j > 0) {
                    constraints.push(
                        new LinearConstraint(particles[k], particles[k - 1]),
                    );
                    constraintsIndices.push(k, k - 1);
                }
                if (i > 0) {
                    constraints.push(
                        new LinearConstraint(particles[k], particles[k - m]),
                    );
                    constraintsIndices.push(k, k - m);
                }
                if (i > 0 && j > 0 && stiff) {
                    constraints.push(
                        new LinearConstraint(
                            particles[k - 1],
                            particles[k - m],
                        ),
                        new LinearConstraint(
                            particles[k],
                            particles[k - m - 1],
                        ),
                    );
                    constraintsIndices.push(k - 1, k - m);
                    constraintsIndices.push(k, k - m - 1);
                }
            }
        }

        if (nx > 1 && ny > 1 && reinforce) {
            constraints.push(
                new LinearConstraint(
                    particles[0],
                    particles[particles.length - 1],
                ),
                new LinearConstraint(particles[0], particles[m - 1]),
                new LinearConstraint(
                    particles[0],
                    particles[particles.length - m],
                ),
                new LinearConstraint(
                    particles[particles.length - m],
                    particles[m - 1],
                ),
                new LinearConstraint(
                    particles[m - 1],
                    particles[particles.length - 1],
                ),
                new LinearConstraint(
                    particles[particles.length - m],
                    particles[particles.length - 1],
                ),
            );

            // prettier-ignore
            constraintsIndices.push(
                0, particles.length - 1,
                0, m - 1, 
                0, particles.length - m,
                particles.length - m, m - 1,
                m - 1, particles.length - 1,
                particles.length - m, particles.length - 1
            );
        }

        super(particles, constraints);
        this.constraintsIndices = constraintsIndices;
    }

    // Compute the convex hull of the body using quickhull algorithm
    convexHull(): PolygonBody {
        if (this._convexHull) {
            return this._convexHull;
        }

        // The convex hull is not defined by less than 3 points
        if (this.particles.length < 3) {
            // Initialize with empty particles to avoid constraints creation
            this._convexHull = new PolygonBody([]);
            this._convexHull.particles = this.particles;
            return this._convexHull;
        }

        const candidates: Particle[] = this.particles.slice(); // A reference copy of the particles objects

        // 1. Find the extreme points
        let pmin: Particle = this.particles[0],
            pmax: Particle = this.particles[0];
        let imin: number = 0,
            imax: number = 0;
        for (let i = 1; i < candidates.length; i++) {
            const particle = candidates[i];
            if (particle.position[0] < pmin.position[0]) {
                pmin = particle;
                imin = i;
            } else if (particle.position[0] > pmax.position[0]) {
                pmax = particle;
                imax = i;
            }
        }

        // 2. Se todos são colineares: retornar potnos ordenados ao longo da linha
        // ex: caso em que o corpo colapse formando uma linha
        let allColinear = true;
        for (const p of candidates) {
            const ab = vec3.subtract(
                vec3.create(),
                pmax.position,
                pmin.position,
            );
            const ap = vec3.subtract(vec3.create(), p.position, pmin.position);
            const cross = vec3.cross(vec3.create(), ab, ap);
            if (Math.abs(vec3.length(cross)) > 1e-12) {
                allColinear = false;
                break;
            }
        }
        if (allColinear) {
            // ordenar por x então y e retornar extremos
            const sorted = candidates
                .slice()
                .sort(
                    (a, b) =>
                        a.position[0] - b.position[0] ||
                        a.position[1] - b.position[1],
                );

            // retorne linha de um extremo ao outro (não repetir)
            this._convexHull = new PolygonBody([]);
            this._convexHull.particles = [sorted[0], sorted[sorted.length - 1]];
            return this._convexHull;
        }

        //  3. Init hull with pmin and pmax
        const convexHull: Particle[] = [pmin, pmax];
        // After the splice call the indices shift, you must remove the elements
        // in descending index order
        const maxIndex = Math.max(imin, imax);
        const minIndex = Math.min(imin, imax);
        candidates.splice(maxIndex, 1);
        candidates.splice(minIndex, 1);

        // 3. Divide the candidates into above and bellow the line
        const above: Particle[] = [];
        const bellow: Particle[] = [];
        for (const particle of candidates) {
            const d = this.distancePointToLine(pmin, pmax, particle);
            if (d > 0) {
                above.push(particle);
            } else {
                bellow.push(particle);
            }
        }
        this.quickhull(pmin, pmax, above, convexHull);
        this.quickhull(pmin, pmax, bellow, convexHull);

        // Initialize with empty particles to avoid constraints creation
        this._convexHull = new PolygonBody([]);
        this._convexHull.particles = convexHull;
        return this._convexHull;
    }

    protected quickhull(
        p0: Particle,
        p1: Particle,
        candidates: Particle[],
        hull: Particle[],
    ) {
        // 4. Find the most distance point from the line
        const farthestDistance = -Infinity;
        let farthestPoint: Particle | null = null;
        // let pointIndex = -1;
        for (let i = 0; i < candidates.length; i++) {
            const particle = candidates[i];
            const d = this.distancePointToLine(p0, p1, particle);
            if (d > farthestDistance) {
                farthestPoint = particle;
                // pointIndex = i;
            }
        }

        if (farthestPoint === null) return;

        const insertIndex = hull.findIndex((pt) => pt === p1);
        if (insertIndex >= 0) {
            hull.splice(insertIndex, 0, farthestPoint);
        }

        // 5. Divide the candidates from lines (p0, farthestPoint) and (p1, farthestPoint)
        // We can ignore the points inside the triangle formed by: p0, p1, farthestPoint
        // The bellows checks of farthestPoint and candidatesLength avoid the next recursive call
        const set1: Particle[] = [];
        const set2: Particle[] = [];
        for (const p of candidates) {
            if (this.distancePointToLine(p0, farthestPoint, p) > 0) {
                set1.push(p);
            } else if (this.distancePointToLine(farthestPoint, p1, p)) {
                set2.push(p);
            }
        }

        this.quickhull(p0, farthestPoint, set1, hull);
        this.quickhull(farthestPoint, p1, set2, hull);
    }
}
