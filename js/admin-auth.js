const AdminAuth = {
  TOKEN_KEY: 'sublime_admin_token',

  getToken() {
    return sessionStorage.getItem(this.TOKEN_KEY);
  },

  setToken(token) {
    sessionStorage.setItem(this.TOKEN_KEY, token);
  },

  clearToken() {
    sessionStorage.removeItem(this.TOKEN_KEY);
  },

  async verify() {
    const token = this.getToken();
    if (!token) return false;
    try {
      const res = await fetch('/api/admin/verify', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) { this.clearToken(); return false; }
      const data = await res.json();
      return data.valid === true;
    } catch {
      return false;
    }
  },

  async login(username, password) {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Échec de connexion');
    this.setToken(data.token);
    return true;
  },

  logout() {
    this.clearToken();
    window.location.reload();
  }
};
