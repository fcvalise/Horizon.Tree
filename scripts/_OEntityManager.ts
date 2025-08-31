import * as hz from "horizon/core";
import { OEntity } from "_OEntity";
import { OWrapper } from "_OWrapper";
import { OPoolManager } from "_OPool";

export class OEntityManager {
    private allList: OEntity[] = [];
    private simulatedList: OEntity[] = [];

    constructor(private wrapper: OWrapper, private pool: OPoolManager) { }

    public create(): OEntity {
        const oEntity = new OEntity(undefined, this.wrapper, this.pool);
        this.allList.push(oEntity);
        return oEntity;
    }

    public register(oEntity: OEntity) {
        this.allList.push(oEntity);
        if (oEntity.isPhysics) {
            this.simulatedList.push(oEntity);
        }
    }
}