import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Appointment } from './appointment.entity';
import { Staff } from './staff.entity';

@Entity({ name: 'appointment_briefs' })
export class AppointmentBrief {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Appointment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Appointment;

  @ManyToOne(() => Staff, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'barber_id' })
  barber: Staff | null;

  @Column({ name: 'client_summary', type: 'text' })
  clientSummary: string;

  @Column({ name: 'safety_notes', type: 'text', nullable: true })
  safetyNotes: string | null;

  @Column({
    name: 'hair_state',
    type: 'text',
    array: true,
    default: () => "'{}'",
  })
  hairState: string[];

  @Column({ name: 'desired_look', type: 'text', nullable: true })
  desiredLook: string | null;

  @Column({ name: 'goal_photo_media_type', type: 'text', nullable: true })
  goalPhotoMediaType: string | null;

  @Column({ name: 'goal_photo_data', type: 'text', nullable: true })
  goalPhotoData: string | null;

  @Column({ name: 'generation_source', type: 'text', default: 'fallback' })
  generationSource: string;

  @Column({ name: 'generation_model', type: 'text', nullable: true })
  generationModel: string | null;

  @CreateDateColumn({
    name: 'generated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  generatedAt: Date;
}
