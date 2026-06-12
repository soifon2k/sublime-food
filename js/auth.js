const Auth = {
  STORAGE_KEY: 'sublime_user',
  OTP_KEY: 'sublime_otp_pending',

  getUser() {
    try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY)); } catch { return null; }
  },

  saveUser(user) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
  },

  isLoggedIn() {
    return !!this.getUser();
  },

  login(email, password) {
    const users = this._getUsers();
    const user = users.find(u => (u.email === email || u.phone === email) && u.password === password);
    if (!user) return { success: false, message: 'Email/téléphone ou mot de passe incorrect.' };
    const session = { ...user, password: undefined };
    this.saveUser(session);
    return { success: true, user: session };
  },

  async register(name, email, phone, password) {
    const users = this._getUsers();
    if (users.find(u => u.email === email)) return { success: false, message: 'Cet email est déjà utilisé.' };
    if (users.find(u => u.phone === phone)) return { success: false, message: 'Ce numéro est déjà utilisé.' };
    const user = {
      id: 'u' + Date.now(),
      name, email, phone, password,
      points: 0,
      favorites: [],
      addresses: [],
      orders: [],
      createdAt: new Date().toISOString()
    };
    users.push(user);
    localStorage.setItem('sublime_users', JSON.stringify(users));
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, userId: user.id })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        sessionStorage.setItem(this.OTP_KEY, JSON.stringify({ userId: user.id, phone, token: data.token }));
        return { success: true, needsOtp: true, phone, message: data.message };
      }
    } catch { /* fallback local */ }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    sessionStorage.setItem(this.OTP_KEY, JSON.stringify({ userId: user.id, otp, phone }));
    return { success: true, needsOtp: true, phone, message: `Code généré pour ${phone}` };
  },

  socialLogin() {
    return { success: false, message: 'Connexion Google/Facebook nécessite une configuration OAuth. Utilisez l\'inscription par email.' };
  },

  async verifyOtp(code) {
    const pending = JSON.parse(sessionStorage.getItem(this.OTP_KEY) || 'null');
    if (!pending) return { success: false, message: 'Aucune vérification en cours.' };

    if (pending.token) {
      try {
        const res = await fetch('/api/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, token: pending.token })
        });
        const data = await res.json();
        if (!res.ok || !data.success) return { success: false, message: data.error || 'Code OTP incorrect.' };
      } catch {
        return { success: false, message: 'Impossible de vérifier le code. Réessayez.' };
      }
    } else if (code !== pending.otp) {
      return { success: false, message: 'Code OTP incorrect.' };
    }

    const users = this._getUsers();
    const user = users.find(u => u.id === pending.userId);
    if (!user) return { success: false, message: 'Utilisateur introuvable.' };
    const session = { ...user, password: undefined };
    this.saveUser(session);
    sessionStorage.removeItem(this.OTP_KEY);
    return { success: true };
  },

  async resendOtp() {
    const pending = JSON.parse(sessionStorage.getItem(this.OTP_KEY) || 'null');
    if (!pending) return { success: false, message: 'Aucune vérification en cours.' };
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: pending.phone, userId: pending.userId })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        sessionStorage.setItem(this.OTP_KEY, JSON.stringify({ ...pending, token: data.token, otp: undefined }));
        return { success: true, message: data.message || 'Code renvoyé par SMS.' };
      }
    } catch { /* fallback */ }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    pending.otp = otp;
    delete pending.token;
    sessionStorage.setItem(this.OTP_KEY, JSON.stringify(pending));
    return { success: true, message: 'Un nouveau code a été généré.' };
  },

  forgotPassword(email) {
    const users = this._getUsers();
    if (!users.find(u => u.email === email)) {
      return { success: false, message: 'Aucun compte associé à cet email.' };
    }
    return { success: true, message: 'Si un compte existe, un lien de réinitialisation sera envoyé à ' + email };
  },

  logout() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  updateProfile(updates) {
    const user = this.getUser();
    if (!user) return;
    Object.assign(user, updates);
    this.saveUser(user);
    const users = this._getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) { users[idx] = { ...users[idx], ...updates }; localStorage.setItem('sublime_users', JSON.stringify(users)); }
  },

  addPoints(amount) {
    const user = this.getUser();
    if (!user) return;
    user.points = (user.points || 0) + amount;
    this.saveUser(user);
  },

  toggleFavorite(productId) {
    const user = this.getUser();
    if (!user) return false;
    user.favorites = user.favorites || [];
    const idx = user.favorites.indexOf(productId);
    if (idx >= 0) { user.favorites.splice(idx, 1); } else { user.favorites.push(productId); }
    this.saveUser(user);
    return user.favorites.includes(productId);
  },

  isFavorite(productId) {
    const user = this.getUser();
    return user?.favorites?.includes(productId) || false;
  },

  _getUsers() {
    try { return JSON.parse(localStorage.getItem('sublime_users')) || []; } catch { return []; }
  }
};
