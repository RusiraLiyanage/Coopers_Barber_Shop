import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum ReferenceDataType {
  BARBER_CAPABILITY = 'barber_capability',
  SAFETY_TRIGGER = 'safety_trigger',
}

@Index('idx_reference_data_items_type', ['type'])
@Unique('uq_reference_data_items_type_value', ['type', 'value'])
@Entity({ name: 'reference_data_items' })
export class ReferenceDataItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  type: ReferenceDataType;

  @Column({ type: 'text' })
  label: string;

  @Column({ type: 'text' })
  value: string;

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
