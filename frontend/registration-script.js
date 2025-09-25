// registration-script.js
document.addEventListener('DOMContentLoaded', function() {
    // API base resolver (supports file:// or different origins)
    const DEFAULT_API = 'http://localhost:4000';
    const API_BASE = (window.__API_BASE || (window.location.protocol === 'file:' ? DEFAULT_API : ''));
    const registrationForm = document.getElementById('registrationForm');
    const loginForm = document.getElementById('loginForm');
    const doctorFields = document.getElementById('doctorFields');
    const passwordInput = document.getElementById('password');
    const passwordStrength = document.getElementById('passwordStrength');
    const submitBtn = document.getElementById('submitBtn');
    const loginBtn = document.getElementById('loginBtn');
    const successMessage = document.getElementById('successMessage');
    const registerTab = document.getElementById('registerTab');
    const loginTab = document.getElementById('loginTab');
    const formTitle = document.getElementById('formTitle');
    const formSubtitle = document.getElementById('formSubtitle');

    // Tab switching functionality
    registerTab.addEventListener('click', function() {
      switchToRegister();
    });

    loginTab.addEventListener('click', function() {
      switchToLogin();
    });

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

    // Role selection handler
    document.querySelectorAll('input[name="role"]').forEach(radio => {
      radio.addEventListener('change', function() {
        if (this.value === 'doctor') {
          doctorFields.classList.add('show');
          document.getElementById('specialization').required = true;
          document.getElementById('license').required = true;
        } else {
          doctorFields.classList.remove('show');
          document.getElementById('specialization').required = false;
          document.getElementById('license').required = false;
        }
      });
    });

    // Password strength checker
    passwordInput.addEventListener('input', function() {
      const password = this.value;
      const strength = calculatePasswordStrength(password);
      
      passwordStrength.className = 'password-strength';
      if (strength.score > 0) {
        passwordStrength.classList.add(strength.level);
      }
    });

    function calculatePasswordStrength(password) {
      let score = 0;
      let level = '';

      if (password.length >= 8) score++;
      if (/[a-z]/.test(password)) score++;
      if (/[A-Z]/.test(password)) score++;
      if (/[0-9]/.test(password)) score++;
      if (/[^A-Za-z0-9]/.test(password)) score++;

      if (score < 3) level = 'weak';
      else if (score < 5) level = 'medium';
      else level = 'strong';

      return { score, level };
    }

    // Form validation
    function validateField(field, errorElement, validationFn) {
      const isValid = validationFn(field.value);
      
      if (isValid) {
        field.classList.remove('field-invalid');
        field.classList.add('field-valid');
        errorElement.style.display = 'none';
      } else {
        field.classList.remove('field-valid');
        field.classList.add('field-invalid');
        errorElement.style.display = 'block';
      }
      
      return isValid;
    }

    // Real-time validation for registration
    document.getElementById('fullname').addEventListener('blur', function() {
      validateField(this, document.getElementById('fullnameError'), 
        value => value.trim().length >= 2);
    });

    document.getElementById('email').addEventListener('blur', function() {
      validateField(this, document.getElementById('emailError'), 
        value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
    });

    document.getElementById('phone').addEventListener('blur', function() {
      validateField(
        this,
        document.getElementById('phoneError'),
        value => {
          const cleaned = value.replace(/\D/g, ''); // Remove all non-digit characters
          return (
            /^(\+91)?[6-9]\d{9}$/.test(value) || // Accept +91 format
            /^0[6-9]\d{9}$/.test(value) ||       // Accept leading 0 format
            /^[6-9]\d{9}$/.test(value)           // Accept plain 10-digit format
          );
        }
      );
    });

    document.getElementById('dob').addEventListener('blur', function() {
      validateField(this, document.getElementById('dobError'), 
        value => {
          if (!value) return false;
          const today = new Date();
          today.setHours(0,0,0,0);
          const birthDate = new Date(value);
          if (isNaN(birthDate.getTime())) return false;
          if (birthDate > today) return false; // disallow future date
          const age = today.getFullYear() - birthDate.getFullYear();
          return age >= 0 && age <= 120;
        });
    });

    passwordInput.addEventListener('blur', function() {
      validateField(this, document.getElementById('passwordError'), 
        value => value.length >= 8);
    });

    // Real-time validation for login
    document.getElementById('loginEmail').addEventListener('blur', function() {
      validateField(this, document.getElementById('loginEmailError'), 
        value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
    });

    document.getElementById('loginPassword').addEventListener('blur', function() {
      validateField(this, document.getElementById('loginPasswordError'), 
        value => value.length > 0);
    });

    // Registration form submission (calls backend)
    registrationForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const formData = new FormData(this);
      const password = formData.get('password');
      if (password.length < 8) {
        document.getElementById('passwordError').textContent = 'Password must be at least 8 characters long';
        document.getElementById('passwordError').style.display = 'block';
        document.getElementById('password').classList.add('field-invalid');
        return;
      }

      const payload = {
        name: formData.get('fullname'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        role: formData.get('role'),
        gender: formData.get('gender'),
        dob: formData.get('dob'),
        password
      };

      submitBtn.classList.add('loading');
      submitBtn.textContent = 'Creating Account...';
      try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Registration failed');
        }
        // Save token and user for dashboard
        sessionStorage.setItem('mc_token', data.token);
        sessionStorage.setItem('mc_user', JSON.stringify(data.user));

        successMessage.style.display = 'block';
        successMessage.textContent = 'Registration successful! Redirecting...';
        const redirectTo = (data.user?.role === 'doctor') ? 'doctor-dashboard.html' : 'dashboard.html';
        setTimeout(() => { window.location.href = redirectTo; }, 800);
      } catch (err) {
        alert(err.message);
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.textContent = 'Create Account';
      }
    });

    // Login form submission (calls backend)
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      loginBtn.classList.add('loading');
      loginBtn.textContent = 'Signing In...';
      try {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Login failed');
        }
        sessionStorage.setItem('mc_token', data.token);
        sessionStorage.setItem('mc_user', JSON.stringify(data.user));
        successMessage.style.display = 'block';
        successMessage.textContent = 'Login successful! Redirecting...';
        const redirectTo = (data.user?.role === 'doctor') ? 'doctor-dashboard.html' : 'dashboard.html';
        setTimeout(() => { window.location.href = redirectTo; }, 800);
      } catch (err) {
        alert(err.message);
      } finally {
        loginBtn.classList.remove('loading');
        loginBtn.textContent = 'Sign In';
      }
    });

    // Forgot password functionality
    document.getElementById('forgotPasswordLink').addEventListener('click', function(e) {
      e.preventDefault();
      alert('Password reset functionality would be implemented here. Please contact support for now.');
    });
});
