import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, throwError } from 'rxjs';

/** Ultimo errore da mostrare all'utente (banner in App). */
@Injectable({ providedIn: 'root' })
export class ErrorMessages {
  readonly current = signal<string | null>(null);

  show(message: string): void {
    this.current.set(message);
  }

  clear(): void {
    this.current.set(null);
  }
}

/** Gestione globale degli errori HTTP: il backend risponde in formato ProblemDetail (RFC 7807). */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messages = inject(ErrorMessages);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const detail: unknown = error.error?.detail;
      messages.show(
        error.status === 0
          ? 'Server non raggiungibile.'
          : typeof detail === 'string'
            ? detail
            : `Errore ${error.status}.`,
      );
      return throwError(() => error);
    }),
  );
};
