package com.morresi.platform;

/** Risorsa richiesta che non esiste: diventa una risposta 404 (ApiExceptionHandler). */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
