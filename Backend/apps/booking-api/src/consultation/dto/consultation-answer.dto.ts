import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

// the question that was asked and the answer the customer provided
export class ConsultationAnswerDto {
  @ApiProperty({ example: 'desired-look' })
  @IsString()
  @MaxLength(80)
  questionId!: string;

  @ApiProperty({
    example: 'I want a natural brown colour and my hair feels dry at the ends.',
  })
  @IsString()
  @MaxLength(1000)
  answer!: string;
}
