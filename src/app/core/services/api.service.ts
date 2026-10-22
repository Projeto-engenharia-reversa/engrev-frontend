import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppState } from '../state';

const TOKEN_KEY = 'engrev.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private state = inject(AppState);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  private authHeaders(): HttpHeaders {
    const token = getToken();
    const headers = new HttpHeaders();
    return token ? headers.set('Authorization', `Bearer ${token}`) : headers;
  }

  private jsonHeaders(): HttpHeaders {
    return this.authHeaders().set('Content-Type', 'application/json');
  }

  /**
   * `silent` desliga o spinner global e o toast de erro desta requisição.
   *
   * Existe para chamadas em segundo plano, como o polling de status da tela de
   * análise: sem isso, uma consulta a cada poucos segundos pisca o overlay de
   * carregamento em cima da tela inteira e enfileira um toast por falha de rede.
   * O tratamento de 401 continua valendo -- sessão expirada nunca é silenciosa.
   */
  private request<T>(observable: Observable<HttpResponse<T>>, silent = false): Observable<T> {
    if (!silent) {
      this.state.beginLoading();
    }
    return observable.pipe(
      map((res) => res.body as T),
      catchError((err: HttpErrorResponse) => {
        if (!silent) {
          const message = err.error?.message ?? `Erro ${err.status}`;
          this.state.error(message);
        }
        if (err.status === 401) {
          setToken(null);
          this.router.navigate(['/login']);
        }
        return throwError(() => err);
      }),
      finalize(() => {
        if (!silent) {
          this.state.endLoading();
        }
      }),
    );
  }

  get<T>(path: string, silent = false): Observable<T> {
    return this.request<T>(
      this.http.get<T>(`${this.apiUrl}${path}`, { headers: this.authHeaders(), observe: 'response' }),
      silent,
    );
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.request<T>(
      this.http.post<T>(`${this.apiUrl}${path}`, body ?? {}, { headers: this.jsonHeaders(), observe: 'response' }),
    );
  }

  delete<T>(path: string): Observable<T> {
    return this.request<T>(
      this.http.delete<T>(`${this.apiUrl}${path}`, { headers: this.jsonHeaders(), observe: 'response' }),
    );
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.request<T>(
      this.http.patch<T>(`${this.apiUrl}${path}`, body ?? {}, { headers: this.jsonHeaders(), observe: 'response' }),
    );
  }

  postForm<T>(path: string, form: FormData): Observable<T> {
    return this.request<T>(
      this.http.post<T>(`${this.apiUrl}${path}`, form, { headers: this.authHeaders(), observe: 'response' }),
    );
  }

  getText(path: string): Observable<string> {
    return this.request<string>(
      this.http.get(`${this.apiUrl}${path}`, {
        headers: this.authHeaders(),
        observe: 'response',
        responseType: 'text',
      }),
    );
  }
}
