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
    } catch { /* mode local */ }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    sessionStorage.setItem(this.OTP_KEY, JSON.stringify({ userId: user.id, otp, phone, localMode: true }));
    return { success: true, needsOtp: true, phone, otp, localMode: true, message: `Code de vérification envoyé au ${phone}` };
  },

  socialLogin(provider, profile) {
    const users = this._getUsers();
    const email = profile.email || `${provider}_${Date.now()}@sublimefood.local`;
    let user = users.find(u => u.email === email || (u.provider === provider && u.email === profile.email));

    if (!user) {
      user = {
        id: 'u' + Date.now(),
        name: profile.name,
        email,
        phone: profile.phone || '',
        password: 'social_' + provider + '_' + Date.now(),
        points: 0,
        favorites: [],
        addresses: [],
        orders: [],
        provider,
        createdAt: new Date().toISOString()
      };
      users.push(user);
      localStorage.setItem('sublime_users', JSON.stringify(users));
    }

    const session = { ...user, password: undefined };
    this.saveUser(session);
    return { success: true, user: session };
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
        if (pending.localMode && code === pending.otp) {
          /* ok local */
        } else {
          return { success: false, message: 'Impossible de vérifier le code. Réessayez.' };
        }
      }
    } else if (code !== pending.otp) {
      return { success: false, message: 'Code OTP incorrect.' };
    }

    const users = this._getUsers();
    const user = users.find(u => u.id === pending.userId);
    if (!user) return { success: false, message: 'Utilisateur introuvable.' };
    const session = { ...user, password: undefined, phoneVerified: true };
    this.saveUser(session);
    sessionStorage.removeItem(this.OTP_KEY);
    return { success: true, user: session };
  },

  getPendingOtp() {
    try { return JSON.parse(sessionStorage.getItem(this.OTP_KEY)); } catch { return null; }
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
        sessionStorage.setItem(this.OTP_KEY, JSON.stringify({ ...pending, token: data.token, otp: undefined, localMode: false }));
        return { success: true, message: data.message || 'Code renvoyé par SMS.' };
      }
    } catch { /* local */ }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    sessionStorage.setItem(this.OTP_KEY, JSON.stringify({ ...pending, otp, token: undefined, localMode: true }));
    return { success: true, message: 'Nouveau code généré.', otp, localMode: true };
  },

  forgotPassword(email) {
    const users = this._getUsers();
    const user = users.find(u => u.email === email);
    if (!user) return { success: false, message: 'Aucun compte associé à cet email.' };
    const tempPass = 'SF' + Math.floor(100000 + Math.random() * 900000);
    user.password = tempPass;
    localStorage.setItem('sublime_users', JSON.stringify(users));
    return { success: true, message: `Mot de passe temporaire : ${tempPass} — Connectez-vous et changez-le dans Paramètres.` };
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
    if (idx >= 0) {
      const merged = { ...users[idx], ...updates };
      if (updates.password) merged.password = updates.password;
      users[idx] = merged;
      localStorage.setItem('sublime_users', JSON.stringify(users));
    }
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
    if (idx >= 0) user.favorites.splice(idx, 1);
    else user.favorites.push(productId);
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
