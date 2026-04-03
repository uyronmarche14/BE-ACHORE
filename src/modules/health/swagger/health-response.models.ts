import { ApiProperty } from '@nestjs/swagger';

export class SwaggerHealthResponseDto {
  @ApiProperty({
    enum: ['ok'],
    example: 'ok',
  })
  status!: 'ok';

  @ApiProperty({
    enum: ['archon-backend'],
    example: 'archon-backend',
  })
  service!: 'archon-backend';
}
