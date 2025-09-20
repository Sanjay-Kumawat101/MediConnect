// dashboard-script.js
// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
  updateUserInfo();
  showTab('dashboard');
});

// Update user information
function updateUserInfo() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
  if (currentUser.name) {
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = currentUser.role || 'User';
    
    // Update profile information
    if (document.getElementById('profileName')) {
      document.getElementById('profileName').textContent = currentUser.name;
    }
    if (document.getElementById('profileRole')) {
      document.getElementById('profileRole').textContent = currentUser.role || 'User';
    }
    
    // Populate profile form
    if (document.getElementById('profileFullName')) {
      document.getElementById('profileFullName').value = currentUser.name || '';
    }
    if (document.getElementById('profileEmail')) {
      document.getElementById('profileEmail').value = currentUser.email || '';
    }
    if (document.getElementById('profilePhone')) {
      document.getElementById('profilePhone').value = currentUser.phone || '';
    }
    if (document.getElementById('profileDOB')) {
      document.getElementById('profileDOB').value = currentUser.dob || '';
    }
  } else {
    // Redirect to registration if no user data
    window.location.href = 'index.html';
  }
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
    localStorage.removeItem('currentUser');
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
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      
      // Update user data
      currentUser.name = document.getElementById('profileFullName').value;
      currentUser.email = document.getElementById('profileEmail').value;
      currentUser.phone = document.getElementById('profilePhone').value;
      currentUser.dob = document.getElementById('profileDOB').value;
      
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      updateUserInfo();
      alert('Profile updated successfully!');
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
      
      alert('Appointment booking functionality would be implemented here.');
      closeModal('appointmentModal');
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
