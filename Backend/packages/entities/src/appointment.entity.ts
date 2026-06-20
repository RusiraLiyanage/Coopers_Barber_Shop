import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Service } from './service.entity';
import { Staff } from './staff.entity';

@Entity({ name: 'appointments' })
export class Appointment {
  // the primary key is a UUID type.
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // many-to-one relationship with users. - many appointments, one user.
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) // If a user is deleted, all appointments belonging to that user are automatically deleted by the database.
  @JoinColumn({ name: 'customer_id' }) // map relation column
  customer: User;

  // many-to-one relationship with services. - many appointments, one service.
  @ManyToOne(() => Service, { onDelete: 'RESTRICT' }) // the referenced Service cannot be deleted if there are existing Appointment records pointing to it.
  @JoinColumn({ name: 'service_id' }) // map relation column
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
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  // many-to-one relationship with staff. - many appointments, one staff member. (is there is an appointment pointing to the staff, the appointment will also be deleted)
  @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;
}
