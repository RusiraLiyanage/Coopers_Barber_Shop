import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SafetyRuleSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity({ name: 'safety_rules' })
export class SafetyRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  condition: string;

  @Column({
    name: 'service_ids',
    type: 'uuid',
    array: true,
    default: () => "'{}'",
  })
  serviceIds: string[];

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text', default: SafetyRuleSeverity.MEDIUM })
  severity: SafetyRuleSeverity;

  @Column({ type: 'boolean', default: true })
  active: boolean;

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
