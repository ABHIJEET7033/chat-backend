import { ArgumentMetadata, Injectable, ParseUUIDPipe, PipeTransform } from '@nestjs/common';

@Injectable()
export class UuidPipe implements PipeTransform<string, Promise<string>> {
  private readonly parser = new ParseUUIDPipe({ version: '4' });

  async transform(value: string, metadata: ArgumentMetadata): Promise<string> {
    const parsed = await this.parser.transform(value, metadata);
    return parsed.toLowerCase();
  }
}

export const uuidPipe = new UuidPipe();
