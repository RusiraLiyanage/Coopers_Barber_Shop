import { PartialType } from '@nestjs/swagger';
import { CreateSafetyRuleDto } from './create-safety-rule.dto';

export class UpdateSafetyRuleDto extends PartialType(CreateSafetyRuleDto) {}
