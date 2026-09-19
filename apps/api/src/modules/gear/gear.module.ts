import { Module } from '@nestjs/common';
import { GearCatalogController } from './gear-catalog.controller.js';
import { GearKitsController } from './gear-kits.controller.js';
import { GearService } from './gear.service.js';

/** Gear: каталог брендов/моделей, комплекты, лодки, видимость. */
@Module({ controllers: [GearCatalogController, GearKitsController], providers: [GearService], exports: [GearService] })
export class GearModule {}
