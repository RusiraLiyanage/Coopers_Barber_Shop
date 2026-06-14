import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ServiceComplexity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

// The structure of the service data table is defined as follows,

@Entity({ name: 'services' })
export class Service {
  // the primary key is a UUID type.
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // the name of the service.
  @Column({ unique: true })
  name: string;

  // the duration of the service in minutes.
  @Column({ name: 'duration_minutes', type: 'smallint' })
  durationMinutes: number;

  // the price of the service.
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // skill tags a barber should have to confidently perform this service.
  @Column({
    name: 'required_skills',
    type: 'text',
    array: true,
    default: () => "'{}'",
  })
  requiredSkills: string[];

  // safety keywords that can trigger a consultation warning before booking.
  @Column({
    name: 'safety_triggers',
    type: 'text',
    array: true,
    default: () => "'{}'",
  })
  safetyTriggers: string[];

  // simple service complexity level used by future matching logic.
  @Column({ type: 'text', default: ServiceComplexity.LOW })
  complexity: ServiceComplexity;

  // timestamps for creation.
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  // timestamp for admin updates.
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
