import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Staff } from './staff.entity';
import { User } from './user.entity';

@Entity({ name: 'hair_history' })
export class HairHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: User;

  @ManyToOne(() => Staff, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'barber_id' })
  barber: Staff | null;

  @Column({ type: 'text' })
  service: string;

  @Column({
    name: 'hair_state',
    type: 'text',
    array: true,
    default: () => "'{}'",
  })
  hairState: string[];

  @Column({ name: 'products_used', type: 'text', nullable: true })
  productsUsed: string | null;

  @Column({ name: 'barber_notes', type: 'text', nullable: true })
  barberNotes: string | null;

  @Column({ name: 'visit_date', type: 'date' })
  visitDate: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
