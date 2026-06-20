import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Appointment,
  AppointmentBrief,
  HairHistory,
  InviteToken,
  ReferenceDataItem,
  SafetyRule,
  Service,
  Staff,
} from '@coopers/entities';
import { Repository } from 'typeorm';

type TimestampSource =
  | AppointmentBrief
  | Appointment
  | HairHistory
  | InviteToken
  | ReferenceDataItem
  | SafetyRule
  | Service
  | Staff;

export type AdminDataVersionResponse = {
  version: string;
};

@Injectable()
export class DataVersionService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(ReferenceDataItem)
    private readonly referenceDataRepository: Repository<ReferenceDataItem>,
    @InjectRepository(SafetyRule)
    private readonly safetyRuleRepository: Repository<SafetyRule>,
    @InjectRepository(AppointmentBrief)
    private readonly appointmentBriefRepository: Repository<AppointmentBrief>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(HairHistory)
    private readonly hairHistoryRepository: Repository<HairHistory>,
    @InjectRepository(InviteToken)
    private readonly inviteTokenRepository: Repository<InviteToken>,
  ) {}

  async getVersion(): Promise<AdminDataVersionResponse> {
    const timestamps = await Promise.all([
      this.getLatestTimestamp(this.staffRepository, 'updatedAt'),
      this.getLatestTimestamp(this.serviceRepository, 'updatedAt'),
      this.getLatestTimestamp(this.referenceDataRepository, 'updatedAt'),
      this.getLatestTimestamp(this.safetyRuleRepository, 'updatedAt'),
      this.getLatestTimestamp(this.appointmentBriefRepository, 'generatedAt'),
      this.getLatestTimestamp(this.appointmentRepository, 'updatedAt'),
      this.getLatestTimestamp(this.hairHistoryRepository, 'createdAt'),
      this.getLatestTimestamp(this.inviteTokenRepository, 'createdAt'),
    ]);

    const latestTimestamp =
      timestamps
        .filter((timestamp): timestamp is Date => timestamp instanceof Date)
        .sort((left, right) => right.getTime() - left.getTime())[0] ??
      new Date(0);

    return {
      version: latestTimestamp.toISOString(),
    };
  }

  private async getLatestTimestamp<T extends TimestampSource>(
    repository: Repository<T>,
    propertyName: keyof T & string,
  ): Promise<Date | null> {
    const result = await repository
      .createQueryBuilder('record')
      .select(`MAX(record.${propertyName})`, 'latestTimestamp')
      .getRawOne<{ latestTimestamp: Date | string | null }>();

    if (!result?.latestTimestamp) {
      return null;
    }

    return new Date(result.latestTimestamp);
  }
}
