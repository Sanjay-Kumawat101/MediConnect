// registration-script.js
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
      validateField(this, document.getElementById('phoneError'), 
        value => /^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/\s/g, '')));
    });

    document.getElementById('dob').addEventListener('blur', function() {
      validateField(this, document.getElementById('dobError'), 
        value => {
          const today = new Date();
          const birthDate = new Date(value);
          const age = today.getFullYear() - birthDate.getFullYear();
          return age >= 13 && age <= 120;
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

    // Registration form submission
    registrationForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Simulate loading state
      submitBtn.classList.add('loading');
      submitBtn.textContent = 'Creating Account...';
      
      // Simulate API call
      setTimeout(() => {
        successMessage.style.display = 'block';
        successMessage.textContent = 'Registration successful! Redirecting to dashboard...';
        submitBtn.classList.remove('loading');
        submitBtn.textContent = 'Account Created!';
        submitBtn.style.background = 'linear-gradient(135deg, #48bb78, #38a169)';
        
        // Simulate redirect to dashboard
        setTimeout(() => {
          window.location.href = '#dashboard'; // In real app, this would redirect to dashboard
        }, 1500);
      }, 1500);
    });

    // Login form submission
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Simulate loading state
      loginBtn.classList.add('loading');
      loginBtn.textContent = 'Signing In...';
      
      // Simulate API call
      setTimeout(() => {
        successMessage.style.display = 'block';
        successMessage.textContent = 'Login successful! Welcome back to MediConnect.';
        loginBtn.classList.remove('loading');
        loginBtn.textContent = 'Signed In!';
        loginBtn.style.background = 'linear-gradient(135deg, #48bb78, #38a169)';
        
        // Simulate redirect to dashboard
        setTimeout(() => {
          window.location.href = '#dashboard'; // In real app, this would redirect to dashboard
        }, 1500);
      }, 1500);
    });

    // Auto-format phone number
    document.getElementById('phone').addEventListener('input', function() {
      let value = this.value.replace(/\D/g, '');
      if (value.length >= 6) {
        value = value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
      } else if (value.length >= 3) {
        value = value.replace(/(\d{3})(\d{3})/, '($1) $2');
      }
      this.value = value;
    });

    // Forgot password functionality
    document.getElementById('forgotPasswordLink').addEventListener('click', function(e) {
      e.preventDefault();
      alert('Password reset functionality would be implemented here. Please contact support for now.');
    });
