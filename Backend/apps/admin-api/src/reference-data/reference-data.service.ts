import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ReferenceDataItem, ReferenceDataType } from '@coopers/entities';
import { DataSource, Repository } from 'typeorm';
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
  ) {}

  findAll(query: ReferenceDataQueryDto): Promise<ReferenceDataItem[]> {
    return this.referenceDataRepository.find({
      where: query.type ? { type: query.type } : {},
      order: {
        type: 'ASC',
        label: 'ASC',
      },
    });
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

    return this.referenceDataRepository.save(item);
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

    return this.referenceDataRepository.save(item);
  }

  async delete(id: string): Promise<DeleteReferenceDataItemResponse> {
    const item = await this.referenceDataRepository.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException('Reference item not found.');
    }

    await this.removeReferences(item.type, item.value);
    await this.referenceDataRepository.remove(item);

    return { success: true };
  }

  private async removeReferences(
    type: ReferenceDataType,
    value: string,
  ): Promise<void> {
    if (type === ReferenceDataType.BARBER_CAPABILITY) {
      await this.dataSource.query(
        `UPDATE staff
         SET skills = array_remove(skills, $1),
             updated_at = CURRENT_TIMESTAMP
         WHERE $1 = ANY(skills)`,
        [value],
      );
      await this.dataSource.query(
        `UPDATE services
         SET required_skills = array_remove(required_skills, $1),
             updated_at = CURRENT_TIMESTAMP
         WHERE $1 = ANY(required_skills)`,
        [value],
      );

      return;
    }

    await this.dataSource.query(
      `UPDATE services
       SET safety_triggers = array_remove(safety_triggers, $1),
           updated_at = CURRENT_TIMESTAMP
       WHERE $1 = ANY(safety_triggers)`,
      [value],
    );
  }
}
