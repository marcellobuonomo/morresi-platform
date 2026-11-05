import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { provideApiConfiguration } from './core/api/api-configuration';
import { errorInterceptor } from './core/errors';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // Stessa origine dell'app: in sviluppo /api passa dal proxy (proxy.conf.json) al backend sulla 8080
    provideApiConfiguration(''),
    provideHttpClient(withInterceptors([errorInterceptor])),
  ],
};
