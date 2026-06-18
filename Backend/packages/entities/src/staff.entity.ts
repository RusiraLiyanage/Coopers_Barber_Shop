import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Appointment } from './appointment.entity';

export enum StaffRole {
  JUNIOR = 'junior',
  SENIOR = 'senior',
  OWNER = 'owner',
}

export enum StaffGender {
  MALE = 'male',
  FEMALE = 'female',
  NON_BINARY = 'non_binary',
  UNSPECIFIED = 'unspecified',
}

// The structure of the staff data table is defined as follows,
@Entity({ name: 'staff' })
export class Staff {
  // the primary key is a UUID type.
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // the display name of the staff member.
  @Column({ name: 'display_name', type: 'text' })
  displayName: string;

  // customer-facing gender metadata shown with the recommended barber.
  @Column({ type: 'text', default: StaffGender.UNSPECIFIED })
  gender: StaffGender;

  // optional contact email for admin/team management.
  @Column({ type: 'text', unique: true, nullable: true })
  email: string | null;

  // the operational level of the barber used by admin matching rules.
  @Column({ type: 'text', default: StaffRole.JUNIOR })
  role: StaffRole;

  // the timezone of the staff member, default is 'Australia/Sydney'. --> appointments are schedulded based on the staff member's working days
  @Column({ type: 'text', default: 'Australia/Sydney' })
  timezone: string;

  // the buffer period a barber get before moving ahead with the next appointment
  @Column({ name: 'buffer_after_minutes', type: 'smallint', default: 15 })
  bufferAfterMinutes: number;

  // skill tags used by the AI consultation/barber matching flow.
  @Column({
    name: 'skills',
    type: 'text',
    array: true,
    default: () => "'{}'",
  })
  skills: string[];

  // rating is intentionally lightweight for now; later it can come from reviews.
  @Column({ type: 'real', default: 0 })
  rating: number;

  // whether the barber can currently receive new appointment suggestions.
  @Column({ type: 'boolean', default: true })
  available: boolean;

  // admin-controlled active flag.
  @Column({ type: 'boolean', default: true })
  active: boolean;

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

  // one-to-many relationship with appointments. - one staff member, many appointments.
  @OneToMany(() => Appointment, (appointment) => appointment.staff)
  appointments: Appointment[];
}
