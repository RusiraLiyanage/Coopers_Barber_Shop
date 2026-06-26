import { IsIn } from 'class-validator';
import {
  AdminDataChangedReason,
  ADMIN_DATA_CHANGED_REASONS,
} from '../admin-realtime.types';

export class NotifyAdminDataChangedDto {
  @IsIn(ADMIN_DATA_CHANGED_REASONS)
  reason!: AdminDataChangedReason;
}
