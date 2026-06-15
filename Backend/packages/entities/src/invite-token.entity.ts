import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User, UserRole } from './user.entity';

@Entity({ name: 'invite_tokens' })
export class InviteToken {
  @PrimaryGeneratedColumn('uuid')
  token: string;

  @Column({ type: 'text' })
  email: string;

  @Column({ type: 'text', default: UserRole.ADMIN })
  role: UserRole;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'invited_by_user_id' })
  invitedBy: User | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'accepted_user_id' })
  acceptedUser: User | null;

  @Column({ type: 'boolean', default: false })
  used: boolean;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
