// dashboard-script.js
// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
  // API base resolver
  window.__API_BASE = window.__API_BASE || (window.location.protocol === 'file:' ? 'http://localhost:4000' : '');
  updateUserInfo();
  showTab('dashboard');
  loadDoctors();
  loadAppointmentsForUser();
});

// Update user information
function updateUserInfo() {
  const token = sessionStorage.getItem('mc_token');
  const storedUser = JSON.parse(sessionStorage.getItem('mc_user') || '{}');
  if (!token || !storedUser?.id) {
    window.location.href = 'index.html';
    return;
  }
  // Populate basic header immediately
  document.getElementById('userName').textContent = storedUser.name || 'User';
  document.getElementById('userRole').textContent = storedUser.role || 'User';

  // Fetch fresh profile from backend
  fetch(`${window.__API_BASE}/api/users/${storedUser.id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => r.json())
    .then(user => {
      if (!user || user.error) return;
      if (document.getElementById('profileName')) document.getElementById('profileName').textContent = user.name || '';
      if (document.getElementById('profileRole')) document.getElementById('profileRole').textContent = user.role || 'User';
      if (document.getElementById('profileFullName')) document.getElementById('profileFullName').value = user.name || '';
      if (document.getElementById('profileEmail')) document.getElementById('profileEmail').value = user.email || '';
      if (document.getElementById('profilePhone')) document.getElementById('profilePhone').value = user.phone || '';
      if (document.getElementById('profileDOB')) document.getElementById('profileDOB').value = user.dob || '';
    })
    .catch(() => {});
}

// Navigation functionality
function showTab(tabName) {
  // Hide all tab contents
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => {
    content.style.display = 'none';
  });

  // Show selected tab content
  const selectedContent = document.getElementById(tabName + 'Content');
  if (selectedContent) {
    selectedContent.style.display = 'block';
  }

  // Update active nav item
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.classList.remove('active');
  });

  const activeNavItem = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeNavItem) {
    activeNavItem.classList.add('active');
  }

  // Close sidebar on mobile after navigation
  if (window.innerWidth <= 1024) {
    toggleSidebar();
  }
}

// Add click event listeners to nav items
document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
  item.addEventListener('click', function(e) {
    e.preventDefault();
    const tabName = this.getAttribute('data-tab');
    showTab(tabName);
  });
});

// Mobile sidebar toggle
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

// Load registered doctors into booking select
function loadDoctors() {
  const token = sessionStorage.getItem('mc_token');
  const select = document.getElementById('doctorSelect');
  if (!select || !token) return;
  fetch(`${window.__API_BASE}/api/users?role=doctor`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => r.json())
    .then(list => {
      select.innerHTML = '<option value="">Choose a doctor</option>';
      (list || []).forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${d.name}${d.gender ? ' • ' + d.gender : ''}`;
        select.appendChild(opt);
      });
    })
    .catch(() => {});
}

// Load appointments for current user and render dynamically
function loadAppointmentsForUser() {
  const token = sessionStorage.getItem('mc_token');
  const user = JSON.parse(sessionStorage.getItem('mc_user') || '{}');
  const container = document.getElementById('appointmentsList');
  if (!token || !user?.id || !container) return;
  fetch(`${window.__API_BASE}/api/appointments`, { headers: { Authorization: `Bearer ${token}` }})
    .then(r => r.json())
    .then(list => {
      container.innerHTML = '';
      (list || [])
        .filter(a => a.user_id === user.id)
        .forEach(a => {
          const card = document.createElement('div');
          const statusClass = a.status === 'upcoming' ? 'status-upcoming' : a.status === 'cancelled' ? 'status-cancelled' : '';
          card.className = `appointment-card ${a.status}`;
          card.innerHTML = `
            <div class="appointment-left">
              <div class="doctor-avatar"><span>👨‍⚕️</span></div>
              <div class="appointment-details">
                <div class="doctor-name">Doctor: ${a.doctor_id}</div>
                <div class="appointment-reason">${a.reason || ''}</div>
              </div>
            </div>
            <div class="appointment-right">
              <div class="appointment-time">
                <div class="date">${a.date}</div>
                <div class="time">${a.time}</div>
              </div>
              <div class="appointment-status ${statusClass}">${a.status}</div>
            </div>`;
          container.appendChild(card);
        });
    })
    .catch(() => {});
}

// Modal functions
function bookAppointment() {
  document.getElementById('appointmentModal').classList.add('show');
}

function openBookingModal() {
  document.getElementById('appointmentModal').classList.add('show');
}

function uploadRecord() {
  alert('Upload record functionality would open a file picker here.');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('show');
  }
});

// Logout function
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    sessionStorage.removeItem('mc_token');
    sessionStorage.removeItem('mc_user');
    window.location.href = 'index.html';
  }
}

// Responsive handling
window.addEventListener('resize', function() {
  if (window.innerWidth > 1024) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
  }
});

// Additional functions for dashboard functionality
function filterAppointments(filter) {
  const appointmentCards = document.querySelectorAll('.appointment-card');
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  // Update filter buttons
  filterButtons.forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  // Filter appointments
  appointmentCards.forEach(card => {
    if (filter === 'all' || card.classList.contains(filter)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

function rescheduleAppointment(id) {
  alert(`Reschedule appointment ${id} functionality would be implemented here.`);
}

function cancelAppointment(id) {
  if (confirm('Are you sure you want to cancel this appointment?')) {
    alert(`Cancel appointment ${id} functionality would be implemented here.`);
  }
}

function viewReport(id) {
  alert(`View report for appointment ${id} functionality would be implemented here.`);
}

// Profile form submission
document.addEventListener('DOMContentLoaded', function() {
  const token = sessionStorage.getItem('mc_token');
  const currentUser = JSON.parse(sessionStorage.getItem('mc_user') || '{}');
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const updates = {
        name: document.getElementById('profileFullName').value,
        email: document.getElementById('profileEmail').value,
        phone: document.getElementById('profilePhone').value,
        dob: document.getElementById('profileDOB').value
      };
      // client-side phone validation (India formats and 10-digit plain)
      const phoneVal = (updates.phone || '').trim();
      const isValidPhone = /^(\+91[6-9]\d{9}|0[6-9]\d{9}|[6-9]\d{9})$/.test(phoneVal);
      if (!isValidPhone) {
        alert('Please enter a valid phone number');
        return;
      }
      fetch(`${window.__API_BASE}/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates)
      }).then(r => r.json()).then(u => {
        if (u && !u.error) {
          sessionStorage.setItem('mc_user', JSON.stringify(u));
          updateUserInfo();
          alert('Profile updated successfully!');
        } else {
          alert(u.error || 'Update failed');
        }
      }).catch(() => alert('Update failed'));
    });
  }
  
  const passwordForm = document.getElementById('passwordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', function(e) {
      e.preventDefault();
      alert('Password change functionality would be implemented here.');
    });
  }
  
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const appointmentDate = document.getElementById('appointmentDate').value;
      const today = new Date();
      const selectedDate = new Date(appointmentDate);
      
      // Validate date is not in the past
      if (selectedDate < today) {
        alert('Cannot book appointment for a past date. Please select a future date.');
        return;
      }
      
      // Validate date is not more than 3 months in the future
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 3);
      if (selectedDate > maxDate) {
        alert('Cannot book appointment more than 3 months in advance.');
        return;
      }
      const user = JSON.parse(sessionStorage.getItem('mc_user') || '{}');
      const doctorId = document.getElementById('doctorSelect').value || 'unknown';
      const time = document.getElementById('appointmentTime').value;
      const reason = document.getElementById('appointmentReason').value;
      fetch(`${window.__API_BASE}/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user.id, doctorId, date: appointmentDate, time, reason })
      }).then(r => r.json()).then(resp => {
        if (resp && !resp.error) {
          alert('Appointment booked successfully!');
          closeModal('appointmentModal');
        } else {
          alert(resp.error || 'Booking failed');
        }
      }).catch(() => alert('Booking failed'));
    });
  }
});

// Medical Records Functions
function filterRecords(filter) {
  const recordCards = document.querySelectorAll('.record-card');
  const filterButtons = document.querySelectorAll('.medical-records-filters .filter-btn');
  
  // Update filter buttons
  filterButtons.forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  // Filter records
  recordCards.forEach(card => {
    if (filter === 'all' || card.classList.contains(filter)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

function viewRecord(id) {
  alert(`View record ${id} functionality would be implemented here.`);
}

function shareRecord(id) {
  alert(`Share record ${id} functionality would be implemented here.`);
}

// AI Health Checkup Functions
function startSymptomAnalysis() {
  alert('Symptom analysis functionality would be implemented here.');
}

function startRiskAssessment() {
  alert('Health risk assessment functionality would be implemented here.');
}

function getRecommendations() {
  alert('Health recommendations functionality would be implemented here.');
}

// Health Alerts Functions
function openAlertSettings() {
  alert('Alert settings functionality would be implemented here.');
}

function markAsRead(id) {
  alert(`Mark alert ${id} as read functionality would be implemented here.`);
}

function dismissAlert(id) {
  alert(`Dismiss alert ${id} functionality would be implemented here.`);
}

function viewResults(id) {
  alert(`View results for alert ${id} functionality would be implemented here.`);
}

// Simulate real-time updates
setInterval(function() {
  const timeElements = document.querySelectorAll('.activity-time');
  // In a real application, this would update with actual timestamps
}, 60000);
