import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';

import { Appointment } from './appointment.entity';

// The structure of the staff data table is defined as follows,
@Entity({ name: 'staff' })
export class Staff {
  // the primary key is a UUID type.
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // the display name of the staff member.
  @Column({ name: 'display_name', type: 'text' })
  displayName: string;

  // the timezone of the staff member, default is 'Australia/Sydney'. --> appointments are schedulded based on the staff member's working days
  @Column({ type: 'text', default: 'Australia/Sydney' })
  timezone: string;

  // the buffer period a barber get before moving ahead with the next appointment
  @Column({ name: 'buffer_after_minutes', type: 'smallint', default: 15 })
  bufferAfterMinutes: number;

  // timestamps for creation.
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  // one-to-many relationship with appointments. - one staff member, many appointments.
  @OneToMany(() => Appointment, (appointment) => appointment.staff)
  appointments: Appointment[];
}
