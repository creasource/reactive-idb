/**
 * @module
 * @ignore
 */
import { Observable } from 'rxjs';

/**
 * @ignore
 * @param request
 * @param complete
 */
export const wrapRequest = <Result>(
  request: () => IDBRequest<Result>,
  complete = true
): Observable<Result> => {
  return new Observable((observer) => {
    const req = request();
    req.onsuccess = () => {
      observer.next(req.result);
      if (complete || observer.closed) {
        observer.complete();
      }
    };
    req.onerror = (ev) => observer.error((ev.target as IDBRequest).error);
  });
};
