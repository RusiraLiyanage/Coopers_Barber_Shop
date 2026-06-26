import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ReferenceDataItem, ReferenceDataType } from '@coopers/entities';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PaginatedResult, PagingMetaDto } from '../common/pagination.dto';
import { AdminRealtimeNotifierService } from '../realtime/admin-realtime-notifier.service';
import { CreateReferenceDataItemDto } from './dto/create-reference-data-item.dto';
import { ReferenceDataQueryDto } from './dto/reference-data-query.dto';
import { UpdateReferenceDataItemDto } from './dto/update-reference-data-item.dto';

export type DeleteReferenceDataItemResponse = {
  success: true;
};

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeValue(value: string): string {
  return normalizeLabel(value).toLowerCase();
}

@Injectable()
export class ReferenceDataService {
  constructor(
    @InjectRepository(ReferenceDataItem)
    private readonly referenceDataRepository: Repository<ReferenceDataItem>,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly adminRealtimeNotifier?: AdminRealtimeNotifierService,
  ) {}

  async findAll(
    query: ReferenceDataQueryDto,
  ): Promise<PaginatedResult<ReferenceDataItem>> {
    const [items, totalItem] = await this.referenceDataRepository.findAndCount({
      where: query.type ? { type: query.type } : {},
      order: {
        type: 'ASC',
        label: 'ASC',
      },
      skip: query.skip,
      take: query.take,
    });

    return {
      data: items,
      pagingMeta: new PagingMetaDto(query, totalItem),
    };
  }

  async create(
    createReferenceDataItemDto: CreateReferenceDataItemDto,
  ): Promise<ReferenceDataItem> {
    const label = normalizeLabel(createReferenceDataItemDto.label);
    const value = normalizeValue(label);
    const existingItem = await this.referenceDataRepository.findOne({
      where: {
        type: createReferenceDataItemDto.type,
        value,
      },
    });

    if (existingItem) {
      throw new ConflictException('Reference item already exists.');
    }

    const item = this.referenceDataRepository.create({
      type: createReferenceDataItemDto.type,
      label,
      value,
    });

    const savedItem = await this.referenceDataRepository.save(item);
    await this.adminRealtimeNotifier?.notifyDataChanged('reference-data');

    return savedItem;
  }

  async update(
    id: string,
    updateReferenceDataItemDto: UpdateReferenceDataItemDto,
  ): Promise<ReferenceDataItem> {
    const item = await this.referenceDataRepository.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException('Reference item not found.');
    }

    item.label = normalizeLabel(updateReferenceDataItemDto.label);

    const savedItem = await this.referenceDataRepository.save(item);
    await this.adminRealtimeNotifier?.notifyDataChanged('reference-data');

    return savedItem;
  }

  async delete(id: string): Promise<DeleteReferenceDataItemResponse> {
    await this.dataSource.transaction(async (manager) => {
      const referenceDataRepository = manager.getRepository(ReferenceDataItem);
      const item = await referenceDataRepository.findOne({ where: { id } });

      if (!item) {
        throw new NotFoundException('Reference item not found.');
      }

      await this.removeReferences(manager, item.type, item.value);
      await referenceDataRepository.remove(item);
    });
    await this.adminRealtimeNotifier?.notifyDataChanged('reference-data');

    return { success: true };
  }

  private async removeReferences(
    manager: EntityManager,
    type: ReferenceDataType,
    value: string,
  ): Promise<void> {
    if (type === ReferenceDataType.BARBER_CAPABILITY) {
      await manager.query(
        `UPDATE staff
         SET skills = array_remove(skills, $1),
             updated_at = CURRENT_TIMESTAMP
         WHERE $1 = ANY(skills)`,
        [value],
      );
      await manager.query(
        `UPDATE services
         SET required_skills = array_remove(required_skills, $1),
             updated_at = CURRENT_TIMESTAMP
         WHERE $1 = ANY(required_skills)`,
        [value],
      );

      return;
    }

    await manager.query(
      `UPDATE services
       SET safety_triggers = array_remove(safety_triggers, $1),
           updated_at = CURRENT_TIMESTAMP
       WHERE $1 = ANY(safety_triggers)`,
      [value],
    );
  }
}
