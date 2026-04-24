import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Service } from '../../services/entities/service.entity';
import { Staff } from '../../staff/entities/staff.entity';

@Entity({ name: 'appointments' })
export class Appointment {
  // the primary key is a UUID type.
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // many-to-one relationship with users. - many appointments, one user.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' }) // ✅ map relation column
  customer: User;

  // many-to-one relationship with services. - many appointments, one service.
  @ManyToOne(() => Service, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_id' }) // ✅ map relation column
  service: Service;

  // start and end time of the appointment with timezone support.
  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt: Date;

  // end time of the appointment with timezone support.
  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt: Date;

  // status of the appointment with a default value of 'booked'.
  @Column({ default: 'booked' })
  status: string;

  // timestamps for creation.
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // many-to-one relationship with staff. - many appointments, one staff member.
  @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;
}
