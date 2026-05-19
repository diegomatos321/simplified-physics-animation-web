import { vec3 } from 'gl-matrix';

import type Particle from '../Particle';
import IConstraint from './IConstraint';

export default class LinearConstraint extends IConstraint {
    constructor(p0: Particle, p1: Particle, restitution: number = 0.5) {
        super(p0, p1, restitution);

        this.relax();
    }

    relax(): void {
        if (this.isActive === false) return;

        const delta = vec3.subtract(
            vec3.create(),
            this.p1.position,
            this.p0.position,
        );
        const deltalength = vec3.length(delta);
        const diff = (deltalength - this.restlength) / deltalength;

        const vel1 = vec3.scale(
            vec3.create(),
            delta,
            diff * this.restitution,
        );
        this.p0.move(vel1);

        const vel2 = vec3.scale(
            vec3.create(),
            delta,
            -diff * this.restitution,
        );
        this.p1.move(vel2);
    }
}
