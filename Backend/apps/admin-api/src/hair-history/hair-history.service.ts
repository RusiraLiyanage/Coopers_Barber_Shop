import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HairHistory, Staff, User } from '@coopers/entities';
import { CreateHairHistoryDto } from './dto/create-hair-history.dto';
import { HairHistoryQueryDto } from './dto/hair-history-query.dto';

function normalizeStringArray(values: string[]): string[] {
  return Array.from(
    new Set(
      values.map((value) => value.trim()).filter((value) => value.length > 0),
    ),
  );
}

@Injectable()
export class HairHistoryService {
  constructor(
    @InjectRepository(HairHistory)
    private readonly hairHistoryRepository: Repository<HairHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  findAll(query: HairHistoryQueryDto = {}): Promise<HairHistory[]> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const historyQuery = this.hairHistoryRepository
      .createQueryBuilder('history')
      .leftJoinAndSelect('history.client', 'client')
      .leftJoinAndSelect('history.barber', 'barber')
      .orderBy('history.visitDate', 'DESC')
      .addOrderBy('history.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (query.clientId) {
      historyQuery.andWhere('client.id = :clientId', {
        clientId: query.clientId,
      });
    }

    if (query.barberId) {
      historyQuery.andWhere('barber.id = :barberId', {
        barberId: query.barberId,
      });
    }

    if (query.fromDate) {
      historyQuery.andWhere('history.visitDate >= :fromDate', {
        fromDate: query.fromDate,
      });
    }

    if (query.toDate) {
      historyQuery.andWhere('history.visitDate <= :toDate', {
        toDate: query.toDate,
      });
    }

    return historyQuery.getMany();
  }

  async create(
    createHairHistoryDto: CreateHairHistoryDto,
  ): Promise<HairHistory> {
    const client = await this.userRepository.findOne({
      where: { id: createHairHistoryDto.clientId },
    });

    if (!client) {
      throw new NotFoundException('Client user not found.');
    }

    const barber = createHairHistoryDto.barberId
      ? await this.staffRepository.findOne({
          where: { id: createHairHistoryDto.barberId },
        })
      : null;

    if (createHairHistoryDto.barberId && !barber) {
      throw new NotFoundException('Barber not found.');
    }

    const hairHistory = this.hairHistoryRepository.create({
      client,
      barber,
      service: createHairHistoryDto.service.trim(),
      hairState: normalizeStringArray(createHairHistoryDto.hairState),
      productsUsed: createHairHistoryDto.productsUsed?.trim() || null,
      barberNotes: createHairHistoryDto.barberNotes?.trim() || null,
      visitDate: createHairHistoryDto.visitDate,
    });

    const savedHistory = await this.hairHistoryRepository.save(hairHistory);

    return this.hairHistoryRepository.findOneOrFail({
      where: { id: savedHistory.id },
      relations: {
        client: true,
        barber: true,
      },
    });
  }
}
