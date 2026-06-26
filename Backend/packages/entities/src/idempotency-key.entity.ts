import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

type JsonResponseBody =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

export enum IdempotencyKeyStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Index('idx_idempotency_keys_user_status', ['userId', 'status'])
@Index('idx_idempotency_keys_expires_at', ['expiresAt'])
@Unique('uq_idempotency_keys_user_key', ['userId', 'key'])
@Entity({ name: 'idempotency_keys' })
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'idempotency_key', type: 'text' })
  key: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  method: string;

  @Column({ type: 'text' })
  path: string;

  @Column({ name: 'request_hash', type: 'text' })
  requestHash: string;

  @Column({
    type: 'text',
    default: IdempotencyKeyStatus.PROCESSING,
  })
  status: IdempotencyKeyStatus;

  @Column({ name: 'response_status_code', type: 'int', nullable: true })
  responseStatusCode: number | null;

  @Column({ name: 'response_body', type: 'jsonb', nullable: true })
  responseBody: JsonResponseBody;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

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
}
