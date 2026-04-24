import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// defining user roles - admin for the future usage.

export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
}

// The structure of the user data table is defined as follows,

@Entity({ name: 'users' })
export class User {
  // the primary key is a UUID type.
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // the email is unique.
  @Column({ unique: true })
  email: string;

  // the password is stored as a hash value.
  @Column({ name: 'password_hash' })
  passwordHash: string;

  // the role is an enum type with a default value of 'customer'. - the current usage
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  // timestamps for creation.
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // timestamp for the last update.
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
