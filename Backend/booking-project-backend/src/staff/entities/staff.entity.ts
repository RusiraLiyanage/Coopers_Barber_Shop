import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Appointment } from '../../appontments/entities/appointment.entity';

// The structure of the staff data table is defined as follows,

@Entity({ name: 'staff' })
export class Staff {
  // the primary key is a UUID type.
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // the display name of the staff member.
  @Column({ name: 'display_name', type: 'text' })
  displayName: string;

  // the timezone of the staff member, default is 'Australia/Sydney'.
  @Column({ type: 'text', default: 'Australia/Sydney' })
  timezone: string;

  // the color associated with the staff member, default is '#FF5733'.
  @Column({ name: 'buffer_after_minutes', type: 'smallint', default: 15 })
  bufferAfterMinutes: number;

  // timestamps for creation.
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // one-to-many relationship with appointments. - one staff member, many appointments.
  @OneToMany(() => Appointment, (appointment) => appointment.staff)
  appointments: Appointment[];
}
