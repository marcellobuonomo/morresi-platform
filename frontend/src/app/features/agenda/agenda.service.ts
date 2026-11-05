import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiConfiguration } from '../../core/api/api-configuration';
import { getAgenda } from '../../core/api/fn/agenda-controller/get-agenda';
import { getAppointment } from '../../core/api/fn/agenda-controller/get-appointment';
import { getServices } from '../../core/api/fn/agenda-controller/get-services';
import { Agenda, AppointmentDetail, ServicePicker } from '../../core/api/models';

@Injectable({ providedIn: 'root' })
export class AgendaService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfiguration);

  /** Giorni da from a to compresi, in formato ISO (2026-11-02). */
  getAgenda(from: string, to: string): Observable<Agenda> {
    return getAgenda(this.http, this.config.rootUrl, { from, to }).pipe(map((response) => response.body));
  }

  getAppointment(id: string): Observable<AppointmentDetail> {
    return getAppointment(this.http, this.config.rootUrl, { id }).pipe(map((response) => response.body));
  }

  getServices(): Observable<ServicePicker> {
    return getServices(this.http, this.config.rootUrl).pipe(map((response) => response.body));
  }
}
