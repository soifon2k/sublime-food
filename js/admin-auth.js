const AdminAuth = {
  TOKEN_KEY: 'sublime_admin_token',
  USERNAME: 'sublime food admin',
  PASSWORD: 'food 123',
  LOCAL_TOKEN: 'sublime-local-admin-valid',

  getToken() {
    return sessionStorage.getItem(this.TOKEN_KEY);
  },

  setToken(token) {
    sessionStorage.setItem(this.TOKEN_KEY, token);
  },

  clearToken() {
    sessionStorage.removeItem(this.TOKEN_KEY);
  },

  checkCredentials(username, password) {
    return username === this.USERNAME && password === this.PASSWORD;
  },

  async verify() {
    const token = this.getToken();
    if (!token) return false;
    if (token === this.LOCAL_TOKEN) return true;
    try {
      const res = await fetch('/api/admin/verify', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) { this.clearToken(); return false; }
      const data = await res.json();
      return data.valid === true;
    } catch {
      return token === this.LOCAL_TOKEN;
    }
  },

  async login(username, password) {
    if (!this.checkCredentials(username, password)) {
      throw new Error('Identifiants administrateur incorrects.');
    }
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        this.setToken(data.token);
        return true;
      }
    } catch { /* mode local */ }
    this.setToken(this.LOCAL_TOKEN);
    return true;
  },

  logout() {
    this.clearToken();
    window.location.reload();
  }
};
