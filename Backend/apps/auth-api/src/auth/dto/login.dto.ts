import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserRole } from '@coopers/entities';

// Data to be expected from the body of the login request.

export class LoginDto {
  // The email of the user trying to log in.
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  @IsString()
  email!: string;

  // The password of the user trying to log in.
  @ApiProperty({ example: 'securePassword123', minLength: 6 })
  @IsString()
  password!: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  endExistingSessions?: boolean;

  // Set by the gateway for privileged login surfaces (e.g. the admin portal) to
  // require the authenticated account to hold this role. The gateway controls
  // this value; a normal customer login leaves it unset. Rejected before any
  // session is issued, so a non-matching account never gets a usable session.
  @ApiProperty({ enum: UserRole, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  requiredRole?: UserRole;
}
