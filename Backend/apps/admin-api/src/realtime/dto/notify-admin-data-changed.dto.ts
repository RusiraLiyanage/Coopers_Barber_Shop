import { IsIn } from 'class-validator';
import {
  AdminDataChangedReason,
  ADMIN_DATA_CHANGED_REASONS,
} from '@coopers/common';

export class NotifyAdminDataChangedDto {
  @IsIn(ADMIN_DATA_CHANGED_REASONS)
  reason!: AdminDataChangedReason;
}
