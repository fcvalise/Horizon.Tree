import * as hz from "horizon/core";
import { OEntity } from "_OEntity";
import { OWrapper } from "_OWrapper";
import { OPoolManager } from "_OPool";

export class OEntityManager {
    private readonly chunkSize = 8;
    private readonly gridSize = 256;

    private map: Map<number, OEntity[]> = new Map();
    private allList: OEntity[] = [];
    private simulatedList: OEntity[] = [];

    constructor(private wrapper: OWrapper, private pool: OPoolManager) { }

    public create(): OEntity {
        const entity = this.pool.get();
        if (entity) {
            return new OEntity(entity, this.wrapper, this.pool);
        }
        return new OEntity(undefined, this.wrapper, this.pool);
    }

    public register(oEntity: OEntity) {
        this.allList.push(oEntity);

        if (oEntity.isPhysics) {
            this.simulatedList.push(oEntity);
        }
    }

    private checkOverlaping() {
        // check if two oEntity refers to the same entity
        // It should never happen
    }

    private getKey(oEntity: OEntity) {
        const x = oEntity.position.x / 8 * 256
        return 
    }
}