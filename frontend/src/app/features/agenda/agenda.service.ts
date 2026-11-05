import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiConfiguration } from '../../core/api/api-configuration';
import { getDay } from '../../core/api/fn/agenda-controller/get-day';
import { AgendaDay } from '../../core/api/models';

@Injectable({ providedIn: 'root' })
export class AgendaService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfiguration);

  /** date in formato ISO, es. 2026-10-31 */
  getDay(date: string): Observable<AgendaDay> {
    return getDay(this.http, this.config.rootUrl, { date }).pipe(map((response) => response.body));
  }
}
