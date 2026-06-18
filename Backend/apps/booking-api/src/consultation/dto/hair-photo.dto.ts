import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, Matches } from 'class-validator';

export const HAIR_PHOTO_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type HairPhotoMediaType = (typeof HAIR_PHOTO_MEDIA_TYPES)[number];

export class HairPhotoDto {
  @ApiProperty({
    enum: HAIR_PHOTO_MEDIA_TYPES,
    example: 'image/jpeg',
  })
  @IsIn(HAIR_PHOTO_MEDIA_TYPES)
  mediaType!: HairPhotoMediaType;

  @ApiProperty({
    description:
      'Base64-encoded image data without a data URL prefix. Keep uploads compressed for consultation use.',
  })
  @IsString()
  @MaxLength(5_000_000)
  @Matches(/^[A-Za-z0-9+/]+={0,2}$/)
  data!: string;
}
