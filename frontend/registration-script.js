document.addEventListener('DOMContentLoaded', async function() {
  const DEFAULT_API = 'http://localhost:4000';
  const API_BASE = window.__API_BASE || (window.location.protocol === 'file:' ? DEFAULT_API : '');
  const client = window.mcSupabase;
  const registrationForm = document.getElementById('registrationForm');
  const loginForm = document.getElementById('loginForm');
  const loginRole = document.getElementById('loginRole');
  const doctorFields = document.getElementById('doctorFields');
  const passwordGroup = document.getElementById('passwordGroup');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('submitBtn');
  const loginBtn = document.getElementById('loginBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const successMessage = document.getElementById('successMessage');
  const registerTab = document.getElementById('registerTab');
  const loginTab = document.getElementById('loginTab');
  const formTitle = document.getElementById('formTitle');
  const formSubtitle = document.getElementById('formSubtitle');
  const emailInput = document.getElementById('email');
  let completingProfile = false;

  function showMessage(message, isError = false) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    successMessage.classList.toggle('error', isError);
  }

  function switchToRegister() {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registrationForm.style.display = 'block';
    loginForm.style.display = 'none';
    formTitle.textContent = 'Join MediConnect';
    formSubtitle.textContent = 'Connect with healthcare professionals and patients';
  }

  function switchToLogin() {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    registrationForm.style.display = 'none';
    loginForm.style.display = 'block';
    formTitle.textContent = 'Welcome Back';
    formSubtitle.textContent = 'Sign in to your MediConnect account';
  }

  function selectedRole() {
    return registrationForm.querySelector('input[name="role"]:checked')?.value || '';
  }

  function profileFromForm() {
    const role = selectedRole();
    return {
      name: document.getElementById('fullname').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      role,
      gender: document.getElementById('gender').value,
      dob: document.getElementById('dob').value,
      specialization: document.getElementById('specialization').value.trim(),
      licenseNumber: document.getElementById('license').value.trim()
    };
  }

  function profileFromMetadata(user) {
    const metadata = user.user_metadata || {};
    return {
      name: metadata.name || metadata.full_name || '',
      phone: metadata.phone || '',
      role: metadata.role || '',
      gender: metadata.gender || '',
      dob: metadata.dob || '',
      specialization: metadata.specialization || '',
      licenseNumber: metadata.licenseNumber || ''
    };
  }

  function profileIsComplete(profile) {
    return Boolean(
      profile.name && profile.phone && profile.role && profile.gender && profile.dob &&
      (profile.role !== 'doctor' || (profile.specialization && profile.licenseNumber))
    );
  }

  async function requestProfile(token, method = 'GET', body) {
    const response = await fetch(`${API_BASE}/api/auth/profile`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json();
    return { response, data };
  }

  function goToAccount(profile) {
    sessionStorage.setItem('mc_user', JSON.stringify(profile));
    if (profile.role === 'doctor' && profile.approval_status === 'rejected') {
      signOutBtn.style.display = 'block';
      showMessage('Your doctor account was not approved. Please contact the MediConnect administrator.');
      return;
    }
    if (profile.role === 'doctor' && profile.approval_status !== 'approved') {
      signOutBtn.style.display = 'block';
      showMessage('Your doctor account has been submitted and is waiting for admin approval. You can sign in again after approval.');
      return;
    }

    showMessage('Account ready. Redirecting...');
    const target = profile.role === 'admin' ? 'admin-dashboard.html' :
      profile.role === 'doctor' ? 'doctor-dashboard.html' : 'dashboard.html';
    setTimeout(() => { window.location.href = target; }, 700);
  }

  function continueToAccount(profile, expectedRole = '') {
    const role = expectedRole || sessionStorage.getItem('mc_expected_role') || '';
    sessionStorage.removeItem('mc_expected_role');
    sessionStorage.removeItem('mc_pending_profile');
    if (role && profile.role !== role) {
      showMessage(`This account is registered as ${profile.role}. Choose ${profile.role} to sign in.`, true);
      return;
    }
    goToAccount(profile);
  }

  function enableProfileCompletion(user, profile = {}) {
    completingProfile = true;
    switchToRegister();
    loginTab.disabled = true;
    passwordGroup.style.display = 'none';
    document.getElementById('registerGoogleBtn').style.display = 'none';
    signOutBtn.style.display = 'block';
    document.getElementById('fullname').value = profile.name || user.user_metadata?.full_name || user.user_metadata?.name || '';
    emailInput.value = user.email || '';
    emailInput.readOnly = true;
    if (profile.phone) document.getElementById('phone').value = profile.phone;
    if (profile.gender) document.getElementById('gender').value = profile.gender;
    if (profile.dob) document.getElementById('dob').value = profile.dob;
    if (profile.specialization) document.getElementById('specialization').value = profile.specialization;
    if (profile.licenseNumber) document.getElementById('license').value = profile.licenseNumber;
    if (profile.role) {
      const radio = registrationForm.querySelector(`input[name="role"][value="${profile.role}"]`);
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
      }
    }
    submitBtn.textContent = 'Complete Profile';
    formTitle.textContent = 'Complete Your Profile';
    formSubtitle.textContent = 'Add the details needed to use MediConnect';
    showMessage('Your Google account is connected. Complete the details below to continue.');
  }

  function isGoogleUser(user) {
    return user.app_metadata?.provider === 'google' ||
      user.identities?.some(identity => identity.provider === 'google');
  }

  async function handleSession(session, expectedRole = '') {
    if (!session?.access_token || completingProfile) return;
    sessionStorage.setItem('mc_token', session.access_token);

    const { response, data } = await requestProfile(session.access_token);
    if (response.ok) {
      continueToAccount(data, expectedRole);
      return;
    }
    if (data.code !== 'PROFILE_REQUIRED') {
      showMessage(data.error || 'Could not load your profile. Please try again.', true);
      return;
    }

    let pendingProfile = null;
    try {
      pendingProfile = JSON.parse(sessionStorage.getItem('mc_pending_profile') || 'null');
    } catch {
      sessionStorage.removeItem('mc_pending_profile');
    }
    const profile = pendingProfile || profileFromMetadata(session.user);
    if (profile.role === 'patient' && isGoogleUser(session.user)) {
      const saved = await requestProfile(session.access_token, 'POST', { role: 'patient' });
      if (saved.response.ok) {
        continueToAccount(saved.data, expectedRole);
        return;
      }
      showMessage(saved.data.error || 'Could not create your patient account. Please try again.', true);
      return;
    }
    if (isGoogleUser(session.user)) {
      showMessage('Google registration is available for patients only. Select Patient on the registration tab to continue.', true);
      return;
    }
    if (profileIsComplete(profile)) {
      const saved = await requestProfile(session.access_token, 'POST', profile);
      if (saved.response.ok) {
        continueToAccount(saved.data, expectedRole);
        return;
      }
      showMessage(saved.data.error || 'Could not save your profile. Please try again.', true);
      return;
    }
    enableProfileCompletion(session.user, profile);
  }

  function validateProfile(profile) {
    if (!registrationForm.reportValidity()) return false;
    if (!profile.role) {
      showMessage('Choose whether you are registering as a patient or doctor.', true);
      return false;
    }
    if (profile.name.length < 2 || !profile.phone || !profile.gender || !profile.dob) {
      showMessage('Enter your name, phone number, gender, and date of birth.', true);
      return false;
    }
    if (profile.role === 'doctor' && (!profile.specialization || !profile.licenseNumber)) {
      showMessage('Doctors must enter their specialization and medical license number.', true);
      return false;
    }
    return true;
  }

  async function finishProfile(profile) {
    const { data: { session }, error } = await client.auth.getSession();
    if (error || !session) throw error || new Error('Your sign-in session expired. Please sign in again.');
    const saved = await requestProfile(session.access_token, 'POST', profile);
    if (!saved.response.ok) throw new Error(saved.data.error || 'Could not save your profile');
    sessionStorage.removeItem('mc_pending_profile');
    completingProfile = false;
    goToAccount(saved.data);
  }

  async function startGoogleSignIn(profile, expectedRole = '') {
    if (profile) sessionStorage.setItem('mc_pending_profile', JSON.stringify(profile));
    else sessionStorage.removeItem('mc_pending_profile');
    if (expectedRole) sessionStorage.setItem('mc_expected_role', expectedRole);
    else sessionStorage.removeItem('mc_expected_role');

    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
    if (error) {
      sessionStorage.removeItem('mc_pending_profile');
      sessionStorage.removeItem('mc_expected_role');
      throw error;
    }
  }

  document.querySelectorAll('input[name="role"]').forEach(radio => {
    radio.addEventListener('change', function() {
      const isDoctor = this.value === 'doctor';
      doctorFields.classList.toggle('show', isDoctor);
      document.getElementById('specialization').required = isDoctor;
      document.getElementById('license').required = isDoctor;
      document.getElementById('registerGoogleBtn').style.display = isDoctor ? 'none' : '';
    });
  });

  registerTab.addEventListener('click', switchToRegister);
  loginTab.addEventListener('click', switchToLogin);

  registrationForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    const profile = profileFromForm();
    if (!validateProfile(profile)) return;

    submitBtn.disabled = true;
    try {
      if (completingProfile) {
        await finishProfile(profile);
        return;
      }

      const email = emailInput.value.trim();
      const password = passwordInput.value;
      if (!email || !emailInput.validity.valid) {
        showMessage('Enter a valid email address.', true);
        emailInput.focus();
        return;
      }
      if (password.length < 8) {
        showMessage('Password must be at least 8 characters.', true);
        passwordInput.focus();
        return;
      }

      sessionStorage.setItem('mc_pending_profile', JSON.stringify(profile));
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { name: profile.name } }
      });
      if (error) throw error;
      if (data.session) {
        await handleSession(data.session);
      } else {
        showMessage('Check your email to confirm your account, then return here to finish setting up your profile.');
      }
    } catch (error) {
      showMessage(error.message || 'Registration failed. Please try again.', true);
    } finally {
      submitBtn.disabled = false;
    }
  });

  loginForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    loginBtn.disabled = true;
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: document.getElementById('loginEmail').value.trim(),
        password: document.getElementById('loginPassword').value
      });
      if (error) throw error;
      await handleSession(data.session, loginRole.value);
    } catch (error) {
      showMessage(error.message || 'Login failed. Please try again.', true);
    } finally {
      loginBtn.disabled = false;
    }
  });

  document.getElementById('registerGoogleBtn').addEventListener('click', async function() {
    if (selectedRole() !== 'patient') {
      showMessage('Select Patient to register with Google.', true);
      return;
    }
    try {
      await startGoogleSignIn({ role: 'patient' });
    } catch (error) {
      showMessage(error.message || 'Google sign-in could not be started.', true);
    }
  });

  document.getElementById('loginGoogleBtn').addEventListener('click', async function() {
    try {
      await startGoogleSignIn(null, loginRole.value);
    } catch (error) {
      showMessage(error.message || 'Google sign-in could not be started.', true);
    }
  });

  document.getElementById('forgotPasswordLink').addEventListener('click', function(event) {
    event.preventDefault();
    alert('Password reset is not set up yet. Contact support for assistance.');
  });

  signOutBtn.addEventListener('click', function() {
    window.mcSignOut().catch(error => showMessage(error.message || 'Could not sign out', true));
  });

  try {
    await window.mcAuthReady;
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error_description') || params.get('error');
    if (oauthError) showMessage(oauthError, true);
    const { data: { session } } = await client.auth.getSession();
    if (session) await handleSession(session);
  } catch (error) {
    showMessage(error.message || 'Could not initialize Supabase authentication.', true);
  }
});
