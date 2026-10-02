/**
 * Servicio Centralizado de API REST
 * Conecta el frontend con el servidor de producción PostgreSQL (puerto 5433)
 */

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('rifas_jwt_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  async getRaffles() { const r=await fetch(API_BASE+'/raffles',{headers:getAuthHeader()}); const d=await r.json(); if(!r.ok)throw new Error(d.error);return d; },
  async createRaffle(raffle:any){return this.mutate('/raffles','POST',raffle);},
  async deleteRaffle(id:string){return this.mutate('/raffles/'+encodeURIComponent(id),'DELETE');},
  async createPrize(prize:any){return this.mutate('/prizes','POST',prize);},
  async deletePrize(id:string){return this.mutate('/prizes/'+encodeURIComponent(id),'DELETE');},
  async mutate(path:string,method:string,body?:any){const r=await fetch(API_BASE+path,{method,headers:{'Content-Type':'application/json',...getAuthHeader()},body:body===undefined?undefined:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error||'No se pudo guardar.');return d;},
  async saveRaffle(raffle: any) { const r=await fetch(API_BASE+'/raffles/'+encodeURIComponent(raffle.id),{method:'PUT',headers:{'Content-Type':'application/json',...getAuthHeader()},body:JSON.stringify(raffle)});const d=await r.json();if(!r.ok)throw new Error(d.error);return d; },

  // --- AUTENTICACIÓN ---
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
    if (data.token) {
      localStorage.setItem('rifas_jwt_token', data.token);
    }
    return data;
  },

  async getCurrentUser() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Sesión no válida o expirada');
    return res.json();
  },

  async changePassword(currentPassword: string, newPassword: string, dni?: string) {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ currentPassword, newPassword, dni }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cambiar contraseña');
    if (data.token) localStorage.setItem('rifas_jwt_token', data.token);
    return data;
  },

  async updateProfile(profileData: {
    name: string;
    email: string;
    phone?: string;
    dni?: string;
    currentPassword?: string;
    newPassword?: string;
  }) {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(profileData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar perfil');
    if (data.token) {
      localStorage.setItem('rifas_jwt_token', data.token);
    }
    return data;
  },

  logout() {
    localStorage.removeItem('rifas_jwt_token');
    localStorage.removeItem('rifas_auth_user');
  },

  // --- ADMINISTRADORES (31 OPERADORES) ---
  async getAdmins() {
    const res = await fetch(`${API_BASE}/admins`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Error al cargar administradores');
    return res.json();
  },

  async createAdmin(data: { name: string; dni: string; email: string; password?: string; assignedRaffleId?: string; assignedQuota?: number }) {
    const res = await fetch(`${API_BASE}/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al registrar administrador');
    return result;
  },

  async updateAdmin(id: string, data: any) {
    const res = await fetch(`${API_BASE}/admins/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al actualizar administrador');
    return result;
  },

  async deleteAdmin(id: string) {
    const res = await fetch(`${API_BASE}/admins/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Error al eliminar administrador');
    return res.json();
  },

  // --- PREMIOS OFICIALES (7 PREMIOS) ---
  async getPrizes() {
    const res = await fetch(`${API_BASE}/prizes`);
    if (!res.ok) throw new Error('Error al cargar premios oficiales');
    return res.json();
  },

  async updatePrize(id: string, data: { name?: string; category?: string; description?: string; order?: number; link?: string }) {
    const res = await fetch(`${API_BASE}/prizes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al actualizar premio');
    return res.json();
  },

  async resetDraws(raffleId: string = 'rf-024') {
    const res = await fetch(`${API_BASE}/prizes/reset`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', ...getAuthHeader() },
      body:JSON.stringify({raffleId}),
    });
    if (!res.ok) throw new Error('Error al reiniciar sorteos');
    return res.json();
  },

  // --- TICKETS Y VENTAS (CUOTA DE 20 POR ADMIN) ---
  async getTickets(sellerId?: string) {
    const url = sellerId ? `${API_BASE}/tickets?sellerId=${encodeURIComponent(sellerId)}` : `${API_BASE}/tickets`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Error al cargar tickets');
    return res.json();
  },

  async createTicket(ticketData: {
    buyerName: string;
    dni: string;
    phone: string;
    paymentMethod: string;
    paymentReference?: string;
    sellerAdminId?: string;
    quantity?: number;
    raffleId?: string;
  }) {
    const res = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(ticketData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al emitir ticket');
    return data;
  },

  async updateTicket(id: string, data: { buyerName?: string; dni?: string; phone?: string }) {
    const res = await fetch(`${API_BASE}/tickets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al actualizar ticket');
    return result;
  },

  async cancelTicket(id: string) {
    const res = await fetch(`${API_BASE}/tickets/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al anular ticket');
    return result;
  },

  // --- SORTEO CRIPTOGRÁFICO EN VIVO (CSPRNG) ---
  async executeDraw(prizeId: string, allowRedraw: boolean = false) {
    const res = await fetch(`${API_BASE}/draw/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ prizeId, allowRedraw }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al ejecutar sorteo');
    return data;
  },

  // --- VERIFICACIÓN PÚBLICA QR (SIN LOGIN) ---
  async verifyPublicTicket(code: string) {
    const res = await fetch(`${API_BASE}/public/verify/${encodeURIComponent(code)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Código de boleto no válido');
    return data;
  },

  // --- CONFIGURACIÓN DEL SISTEMA ---
  async getConfig() {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) throw new Error('Error al cargar configuración');
    return res.json();
  },

  async updateConfig(configData: any) {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(configData),
    });
    if (!res.ok) throw new Error('Error al actualizar configuración');
    return res.json();
  },

  // --- AUDITORÍA INMUTABLE ---
  async getAuditLogs() {
    const res = await fetch(`${API_BASE}/audit`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Error al consultar auditoría');
    return res.json();
  },
};

export default api;
