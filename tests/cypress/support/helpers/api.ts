interface ApiItem { id: string; }
interface PagedResult { items: ApiItem[]; }

interface RegisterBody {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  description?: string;
  notes?: string;
}

interface AdminCreateBody {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  description?: string;
  notes?: string;
}

export function apiSignIn(username: string, password: string): Cypress.Chainable<string> {
  return cy
    .request<{ token: string }>({ method: 'POST', url: '/api/auth/sign-in', body: { username, password } })
    .its('body.token');
}

export function apiCreateMyLeave(token: string, body: RegisterBody): Cypress.Chainable<string> {
  return cy
    .request<ApiItem>({
      method: 'POST',
      url: '/api/me/leave',
      headers: { Authorization: `Bearer ${token}` },
      body,
    })
    .its('body.id');
}

export function apiDeleteMyLeave(token: string, id: string): void {
  cy.request({
    method: 'DELETE',
    url: `/api/me/leave/${id}`,
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });
}

export function apiCleanupMyLeave(token: string): void {
  cy.request<ApiItem[]>({
    method: 'GET',
    url: '/api/me/leave',
    headers: { Authorization: `Bearer ${token}` },
  }).then(({ body }) => {
    body.forEach(({ id }) => apiDeleteMyLeave(token, id));
  });
}

export function apiAdminCreateLeave(token: string, body: AdminCreateBody): Cypress.Chainable<string> {
  return cy
    .request<ApiItem>({
      method: 'POST',
      url: '/api/admin/leave',
      headers: { Authorization: `Bearer ${token}` },
      body,
    })
    .its('body.id');
}

export function apiAdminDeleteLeave(token: string, id: string): void {
  cy.request({
    method: 'DELETE',
    url: `/api/admin/leave/${id}`,
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });
}

// GET /api/admin/leave returns PagedResult — use .body.items, not .body
export function apiCleanupAdminLeave(token: string): void {
  cy.request<PagedResult>({
    method: 'GET',
    url: '/api/admin/leave',
    headers: { Authorization: `Bearer ${token}` },
  }).then(({ body }) => {
    body.items.forEach(({ id }) => apiAdminDeleteLeave(token, id));
  });
}
