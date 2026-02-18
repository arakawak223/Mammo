import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { plainToInstance, ClassConstructor } from 'class-transformer';

@Injectable()
export class SerializeInterceptor<T> implements NestInterceptor {
  constructor(private dto: ClassConstructor<T>) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (Array.isArray(data)) {
          return data.map((item) =>
            plainToInstance(this.dto, item, { excludeExtraneousValues: false }),
          );
        }
        if (data && typeof data === 'object') {
          return plainToInstance(this.dto, data, { excludeExtraneousValues: false });
        }
        return data;
      }),
    );
  }
}
