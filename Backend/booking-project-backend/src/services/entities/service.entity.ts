import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

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

  // timestamps for creation.
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
