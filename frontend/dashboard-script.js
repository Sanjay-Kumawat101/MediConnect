// dashboard-script.js
// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
  // API base resolver
  window.__API_BASE = window.__API_BASE || (window.location.protocol === 'file:' ? 'http://localhost:4000' : '');
  updateUserInfo();
  showTab('dashboard');
  loadDoctors();
  loadAppointmentsForUser();
  loadDashboardStats();
  loadMedicalRecords();
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
      const userAppointments = (list || []).filter(a => a.user_id === user.id && a.status !== 'completed');
      userAppointments.forEach(a => {
        const card = document.createElement('div');
        const statusClass = a.status === 'upcoming' ? 'status-upcoming' : a.status === 'cancelled' ? 'status-cancelled' : '';
        card.className = `appointment-card ${a.status}`;
        let actions = '';
        if (a.status === 'upcoming') {
          actions = `<button class="action-btn-small btn-success mark-visited-btn" data-id="${a.id}">Mark as Visited</button>`;
        }
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
            <div class="appointment-actions">${actions}</div>
          </div>`;
        container.appendChild(card);
      });
      // Attach mark as visited events
      container.querySelectorAll('.mark-visited-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const apptId = this.getAttribute('data-id');
          const token = sessionStorage.getItem('mc_token');
          fetch(`${window.__API_BASE}/api/appointments/${apptId}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
            body: JSON.stringify({status: 'completed'})
          })
            .then(r => r.json())
            .then(() => loadAppointmentsForUser());
        });
      });
      // Update appointment stats
      updateAppointmentStats(userAppointments);
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
  document.getElementById('uploadRecordModal').classList.add('show');
  // Reset form
  document.getElementById('uploadRecordForm').reset();
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
function filterAppointments(filter, evt) {
  const appointmentCards = document.querySelectorAll('.appointment-card');
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  // Update filter buttons
  filterButtons.forEach(btn => btn.classList.remove('active'));
  const eventObj = evt || window.event;
  if (eventObj && eventObj.target) {
    eventObj.target.classList.add('active');
  }
  
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
function loadMedicalRecords() {
  const token = sessionStorage.getItem('mc_token');
  const container = document.getElementById('medicalRecordsList');
  
  if (!token || !container) return;
  
  fetch(`${window.__API_BASE}/api/records`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => r.json())
    .then(records => {
      container.innerHTML = '';
      if (records && records.length > 0) {
        records.forEach(record => {
          const card = createRecordCard(record);
          container.appendChild(card);
        });
      } else {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #718096;">
            <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
            <h3>No medical records yet</h3>
            <p>Upload your first medical record to get started</p>
          </div>
        `;
      }
      updateMedicalRecordsStats(records || []);
    })
    .catch(() => {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #e53e3e;">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <h3>Failed to load records</h3>
          <p>Please try again later</p>
        </div>
      `;
    });
}

function createRecordCard(record) {
  const card = document.createElement('div');
  card.className = `record-card ${record.type}`;
  
  const typeIcons = {
    'lab': '🧪',
    'prescription': '💊',
    'scan': '📷',
    'other': '📄'
  };
  
  const typeLabels = {
    'lab': 'Lab Report',
    'prescription': 'Prescription',
    'scan': 'Scan & Image',
    'other': 'Other'
  };
  
  const recordDate = record.record_date ? new Date(record.record_date).toLocaleDateString('en-IN') : 
                    new Date(record.created_at).toLocaleDateString('en-IN');
  
  card.innerHTML = `
    <div class="record-icon">${typeIcons[record.type] || '📄'}</div>
    <div class="record-details">
      <div class="record-title">${record.title}</div>
      <div class="record-date">${recordDate}</div>
      <div class="record-type">${typeLabels[record.type] || 'Other'}</div>
      ${record.doctor_name ? `<div class="record-doctor">Dr. ${record.doctor_name}</div>` : ''}
      ${record.description ? `<div class="record-description">${record.description}</div>` : ''}
    </div>
    <div class="record-actions">
      <button class="action-btn-small btn-secondary" onclick="viewRecord('${record.id}')">View</button>
      <button class="action-btn-small btn-primary" onclick="downloadRecord('${record.id}')">Download</button>
      <button class="action-btn-small btn-danger" onclick="deleteRecord('${record.id}')">Delete</button>
    </div>
  `;
  
  return card;
}

function updateMedicalRecordsStats(records) {
  const stats = {
    total: records.length,
    recent: records.filter(record => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(record.created_at) >= weekAgo;
    }).length,
    byType: {}
  };
  
  records.forEach(record => {
    stats.byType[record.type] = (stats.byType[record.type] || 0) + 1;
  });
  
  // Update dashboard stats
  document.getElementById('medicalRecordsCount').textContent = stats.total;
}

function filterRecords(filter, evt) {
  const recordCards = document.querySelectorAll('.record-card');
  const filterButtons = document.querySelectorAll('.medical-records-filters .filter-btn');
  
  // Update filter buttons
  filterButtons.forEach(btn => btn.classList.remove('active'));
  const eventObj = evt || window.event;
  if (eventObj && eventObj.target) {
    eventObj.target.classList.add('active');
  }
  
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
  const token = sessionStorage.getItem('mc_token');
  
  fetch(`${window.__API_BASE}/api/records/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => r.json())
    .then(record => {
      if (record && !record.error) {
        // Open the file in a new tab
        window.open(`${window.__API_BASE}${record.file_path}`, '_blank');
      } else {
        alert('Failed to load record');
      }
    })
    .catch(() => alert('Failed to load record'));
}

function downloadRecord(id) {
  const token = sessionStorage.getItem('mc_token');
  
  fetch(`${window.__API_BASE}/api/records/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => r.json())
    .then(record => {
      if (record && !record.error) {
        // Create download link
        const link = document.createElement('a');
        link.href = `${window.__API_BASE}${record.file_path}`;
        link.download = record.original_name || record.title;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Failed to download record');
      }
    })
    .catch(() => alert('Failed to download record'));
}

function deleteRecord(id) {
  if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
    return;
  }
  
  const token = sessionStorage.getItem('mc_token');
  
  fetch(`${window.__API_BASE}/api/records/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => {
      if (r.ok) {
        alert('Record deleted successfully');
        loadMedicalRecords(); // Reload the list
      } else {
        alert('Failed to delete record');
      }
    })
    .catch(() => alert('Failed to delete record'));
}

function shareRecord(id) {
  alert(`Share record ${id} functionality would be implemented here.`);
}

// Health Checkup Functions
function startSymptomAnalysis() {
  openSymptomAnalysisModal();
}

function startRiskAssessment() {
  // Show modal
  document.getElementById('riskAssessmentModal').classList.add('show');
  renderRiskQuestions();
  document.getElementById('riskResult').style.display = 'none';
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

// Load dashboard statistics
function loadDashboardStats() {
  const token = sessionStorage.getItem('mc_token');
  if (!token) return;

  // Load alerts count
  fetch(`${window.__API_BASE}/api/alerts`, { headers: { Authorization: `Bearer ${token}` }})
    .then(r => r.json())
    .then(alerts => {
      const alertsArray = alerts || [];
      const activeAlerts = alertsArray.length;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAlerts = alertsArray.filter(a => new Date(a.created_at) >= weekAgo).length;
      const urgentAlerts = alertsArray.filter(a => a.severity === 'urgent' || a.severity === 'warning').length;
      
      document.getElementById('activeAlertsCount').textContent = activeAlerts;
      document.getElementById('alertStatsActive').textContent = activeAlerts;
      document.getElementById('alertStatsWeek').textContent = weekAlerts;
      document.getElementById('alertStatsUrgent').textContent = urgentAlerts;
    })
    .catch(() => {});

  // Medical records count (placeholder - you can implement this if you have a records endpoint)
  document.getElementById('medicalRecordsCount').textContent = '0';
}

// Update appointment statistics
function updateAppointmentStats(appointments) {
  const upcoming = appointments.filter(a => a.status === 'upcoming' || a.status === 'pending').length;
  const completed = appointments.filter(a => a.status === 'completed').length;
  const cancelled = appointments.filter(a => a.status === 'cancelled').length;

  // Update dashboard card
  document.getElementById('upcomingAppointmentsCount').textContent = upcoming;
  
  // Update appointment stats section
  document.getElementById('appointmentStatsUpcoming').textContent = upcoming;
  document.getElementById('appointmentStatsCompleted').textContent = completed;
  document.getElementById('appointmentStatsCancelled').textContent = cancelled;
}

// Government Scheme Website Redirects
function openSchemeWebsite(schemeType) {
  const schemeUrls = {
    // Ayushman Bharat (PM-JAY) - Updated URLs
    'ayushman-bharat': 'https://www.pmjay.gov.in/',
    'ayushman-bharat-eligibility': 'https://beneficiary.nha.gov.in/',
    
    // CGHS - Updated URLs
    'cghs': 'https://www.cghs.mohfw.gov.in/AHIMSG5/hissso/Login',
    'cghs-apply': 'https://www.cghs.mohfw.gov.in/AHIMSG5/hissso/Login',
    
    // ESI Scheme - Updated URLs
    'esi-register': 'https://esic.gov.in/',
    'esi-hospitals': 'https://esic.gov.in/information-benefits',
    
    // Janani Suraksha Yojana - Updated URLs
    'jsy-apply': 'https://nhm.gov.in/index1.php?lang=1&level=3&sublinkid=841&lid=309',
    'jsy-guidelines': 'https://nhm.gov.in/WriteReadData/l892s/97827133331523438951.pdf'
  };
  
  const url = schemeUrls[schemeType];
  if (url) {
    // Add error handling for failed redirects
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to open scheme website:', error);
      alert('Unable to open the website. Please try again later or visit the official government website directly.');
    }
  } else {
    alert('Website information not available for this scheme. Please visit the official government portal for more information.');
  }
}

// Simulate real-time updates
setInterval(function() {
  const timeElements = document.querySelectorAll('.activity-time');
  // In a real application, this would update with actual timestamps
}, 60000);

// Improved 15 health risk questions with types and clear labels
const riskQuestions = [
  { text: 'How many days per week do you engage in at least 30 minutes of physical activity?', type: 'number', min: 0, max: 7 },
  { text: 'Do you smoke any tobacco products?', type: 'yesno' },
  { text: 'On average, how many servings of fruits and vegetables do you eat per day?', type: 'number', min: 0, max: 10 },
  { text: 'How many hours of sleep do you get per night?', type: 'number', min: 0, max: 24 },
  { text: 'Do you consume alcohol?', type: 'yesno' },
  { text: 'How often do you feel stressed or anxious?', type: 'rating', labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] },
  { text: 'Do you have any diagnosed chronic conditions (e.g., diabetes, hypertension, asthma)?', type: 'yesno' },
  { text: 'How often do you eat fast food or processed snacks?', type: 'rating', labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Daily'] },
  { text: 'How many glasses of water do you drink per day?', type: 'number', min: 0, max: 20 },
  { text: 'Do you use recreational drugs?', type: 'yesno' },
  { text: 'How often do you have a medical checkup (including blood pressure, cholesterol, etc.)?', type: 'rating', labels: ['Never', 'Rarely', 'Every few years', 'Every 1-2 years', 'Yearly'] },
  { text: 'Do you have a family history of heart disease, stroke, or cancer?', type: 'yesno' },
  { text: 'How would you rate your current mental health?', type: 'rating', labels: ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'] },
  { text: 'Do you experience unexplained pain, fatigue, or other symptoms regularly?', type: 'yesno' },
  { text: 'How would you rate your overall health?', type: 'rating', labels: ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'] }
];

function renderRiskQuestions() {
  const container = document.getElementById('riskQuestions');
  container.innerHTML = '';
  riskQuestions.forEach((q, i) => {
    const qDiv = document.createElement('div');
    qDiv.className = 'form-group';
    let inputHtml = '';
    if (q.type === 'rating') {
      inputHtml = `<div class="risk-rating-group">\n` +
        [1,2,3,4,5].map(val => `
          <label class="risk-rating-label">
            <input type="radio" name="riskQ${i}" value="${val}" required>
            <span>${val}</span>
            <div style='font-size:11px;color:#555;'>${q.labels ? q.labels[val-1] : ''}</div>
          </label>
        `).join('') +
      `</div>`;
    } else if (q.type === 'yesno') {
      inputHtml = `<div class="risk-yesno-group">\n` +
        `<label><input type="radio" name="riskQ${i}" value="yes" required> Yes</label>\n` +
        `<label><input type="radio" name="riskQ${i}" value="no" required> No</label>\n` +
      `</div>`;
    } else if (q.type === 'number') {
      inputHtml = `<input type="number" name="riskQ${i}" min="${q.min}" max="${q.max}" required style="width:120px;">`;
    }
    qDiv.innerHTML = `<label>Q${i+1}. ${q.text}</label>${inputHtml}`;
    container.appendChild(qDiv);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  const riskForm = document.getElementById('riskAssessmentForm');
  if (riskForm) {
    riskForm.addEventListener('submit', function(e) {
      e.preventDefault();
      let total = 0;
      let answered = 0;
      for (let i = 0; i < riskQuestions.length; i++) {
        const q = riskQuestions[i];
        let val = null;
        if (q.type === 'rating') {
          const el = riskForm.querySelector(`input[name="riskQ${i}"]:checked`);
          if (el) {
            val = parseInt(el.value);
            // For positive ratings (e.g., mental health, overall health, checkups): higher is better
            // For negative ratings (e.g., stress, fast food): lower is better
            if (q.text.toLowerCase().includes('stress') || q.text.toLowerCase().includes('fast food')) {
              total += (6 - val); // 5=worst, 1=best
            } else {
              total += val; // 5=best, 1=worst
            }
            answered++;
          }
        } else if (q.type === 'yesno') {
          const el = riskForm.querySelector(`input[name="riskQ${i}"]:checked`);
          if (el) {
            // For risk questions, 'no' is healthy (score 5), 'yes' is risky (score 1)
            // For family history, chronic, smoking, alcohol, drugs, pain, etc.
            if (
              q.text.toLowerCase().includes('smoke') ||
              q.text.toLowerCase().includes('alcohol') ||
              q.text.toLowerCase().includes('chronic') ||
              q.text.toLowerCase().includes('drugs') ||
              q.text.toLowerCase().includes('pain') ||
              q.text.toLowerCase().includes('family history')
            ) {
              total += (el.value === 'no' ? 5 : 1);
            } else {
              // If ever a positive yes/no (not present now), treat 'yes' as healthy
              total += (el.value === 'yes' ? 5 : 1);
            }
            answered++;
          }
        } else if (q.type === 'number') {
          const el = riskForm.querySelector(`input[name="riskQ${i}"]`);
          if (el && el.value !== '') {
            val = parseFloat(el.value);
            // Custom logic for each number question
            if (q.text.toLowerCase().includes('physical activity')) {
              // 7 days = 5, 5-6 = 4, 3-4 = 3, 1-2 = 2, 0 = 1
              if (val >= 7) total += 5;
              else if (val >= 5) total += 4;
              else if (val >= 3) total += 3;
              else if (val >= 1) total += 2;
              else total += 1;
            } else if (q.text.toLowerCase().includes('fruits and vegetables')) {
              // 5+ = 5, 3-4 = 4, 2 = 3, 1 = 2, 0 = 1
              if (val >= 5) total += 5;
              else if (val >= 3) total += 4;
              else if (val == 2) total += 3;
              else if (val == 1) total += 2;
              else total += 1;
            } else if (q.text.toLowerCase().includes('sleep')) {
              // 7-9 = 5, 6 or 10 = 4, 5 or 11 = 3, 4 or 12 = 2, else 1
              if (val >= 7 && val <= 9) total += 5;
              else if (val == 6 || val == 10) total += 4;
              else if (val == 5 || val == 11) total += 3;
              else if (val == 4 || val == 12) total += 2;
              else total += 1;
            } else if (q.text.toLowerCase().includes('water')) {
              // 8+ = 5, 6-7 = 4, 4-5 = 3, 2-3 = 2, 0-1 = 1
              if (val >= 8) total += 5;
              else if (val >= 6) total += 4;
              else if (val >= 4) total += 3;
              else if (val >= 2) total += 2;
              else total += 1;
            } else {
              // Default: mid-range is best
              total += 3;
            }
            answered++;
          }
        }
      }
      if (answered < riskQuestions.length) {
        alert('Please answer all questions.');
        return;
      }
      // Calculate result
      let maxScore = 5 * riskQuestions.length;
      // Normalize score to 100
      let score = Math.round((total / maxScore) * 100);
      let result = '';
      let tip = '';
      if (score < 50) {
        result = '<span style="color:#e53e3e;font-weight:bold;">High Risk</span> - Please consult a healthcare professional soon.';
        tip = 'Consider scheduling a checkup and adopting healthier habits like regular exercise and a balanced diet.';
      } else if (score < 80) {
        result = '<span style="color:#d69e2e;font-weight:bold;">Moderate Risk</span> - Consider lifestyle improvements.';
        tip = 'Try to improve your sleep, reduce stress, and eat more whole foods.';
      } else {
        result = '<span style="color:#38a169;font-weight:bold;">Low Risk</span> - Keep up the good habits!';
        tip = 'Great job! Maintain your healthy lifestyle and get regular checkups.';
      }
      document.getElementById('riskResult').innerHTML = `<h4>Your Health Risk Result:</h4><div style='margin:10px 0;'>${result}</div><div>Total Score: ${score} / 100</div>`;
      document.getElementById('riskResult').style.display = 'block';
      // Show legend popup with tip and result
      setTimeout(function() {
        document.getElementById('healthTip').innerHTML = `<b>Health Tip:</b> ${tip}`;
        document.getElementById('healthLegendModal').classList.add('show');
        // Also show result in legend popup
        document.querySelector('#healthLegendModal .modal-body').insertAdjacentHTML('afterbegin', `<div id='legendResult' style='margin-bottom:12px;font-size:16px;'><b>Result:</b> ${result} <br><b>Score:</b> ${score} / 100</div>`);
        // Update Recent Analysis Results
        document.getElementById('recentHealthScore').textContent = `Health Score: ${score}/100`;
        document.getElementById('recentHealthDate').textContent = `Last checked: ${new Date().toLocaleString()}`;
        document.getElementById('recentHealthSummary').innerHTML = `<div class='result-item'><span class='result-icon'>${score < 50 ? '⚠️' : score < 80 ? '❗' : '✅'}</span><span>${result.replace(/<[^>]+>/g, '')}</span></div>`;
        // Store recent result in backend and localStorage
        const token = sessionStorage.getItem('mc_token');
        const details = {};
        // Optionally store answers (for future use)
        for (let i = 0; i < riskQuestions.length; i++) {
          const q = riskQuestions[i];
          let val = null;
          if (q.type === 'rating') {
            const el = riskForm.querySelector(`input[name="riskQ${i}"]:checked`);
            if (el) val = parseInt(el.value);
          } else if (q.type === 'yesno') {
            const el = riskForm.querySelector(`input[name="riskQ${i}"]:checked`);
            if (el) val = el.value;
          } else if (q.type === 'number') {
            const el = riskForm.querySelector(`input[name="riskQ${i}"]`);
            if (el && el.value !== '') val = parseFloat(el.value);
          }
          details[`q${i+1}`] = val;
        }
        if (token) {
          fetch(`${window.__API_BASE}/api/health-assessments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ score, result: result.replace(/<[^>]+>/g, ''), details })
          }).then(r => r.json()).then(data => {
            if (data && !data.error) {
              localStorage.setItem('recentHealthResult', JSON.stringify({
                score: data.score,
                result: data.result,
                date: data.created_at || new Date().toLocaleString()
              }));
            }
          }).catch(() => {});
        }
      }, 800);
    });
  }
});

// Load recent health result from backend on page load
document.addEventListener('DOMContentLoaded', function() {
  const token = sessionStorage.getItem('mc_token');
  if (token) {
    fetch(`${window.__API_BASE}/api/health-assessments/recent`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          document.getElementById('recentHealthScore').textContent = `Health Score: ${data.score}/100`;
          document.getElementById('recentHealthDate').textContent = `Last checked: ${data.created_at ? new Date(data.created_at).toLocaleString() : '--'}`;
          document.getElementById('recentHealthSummary').innerHTML = `<div class='result-item'><span class='result-icon'>${data.score < 50 ? '⚠️' : data.score < 80 ? '❗' : '✅'}</span><span>${data.result}</span></div>`;
          // Update health risk level on dashboard
          const riskLevel = data.score < 50 ? 'High Risk' : data.score < 80 ? 'Moderate' : 'Low Risk';
          document.getElementById('healthRiskLevel').textContent = riskLevel;
          // Also update localStorage for offline fallback
          localStorage.setItem('recentHealthResult', JSON.stringify({
            score: data.score,
            result: data.result,
            date: data.created_at || new Date().toLocaleString()
          }));
        }
      })
      .catch(() => {
        // fallback to localStorage
        const recent = localStorage.getItem('recentHealthResult');
        if (recent) {
          try {
            const data = JSON.parse(recent);
            document.getElementById('recentHealthScore').textContent = `Health Score: ${data.score}/100`;
            document.getElementById('recentHealthDate').textContent = `Last checked: ${data.date}`;
            document.getElementById('recentHealthSummary').innerHTML = `<div class='result-item'><span class='result-icon'>${data.score < 50 ? '⚠️' : data.score < 80 ? '❗' : '✅'}</span><span>${data.result}</span></div>`;
          } catch {}
        }
      });
  }
});

// --- Symptom Analysis Modal Logic ---
function openSymptomAnalysisModal() {
  document.getElementById('symptomAnalysisModal').classList.add('show');
  document.getElementById('symptomInput').value = '';
  document.getElementById('symptomAnalysisResult').style.display = 'none';
  document.getElementById('symptomAnalysisResult').innerHTML = '';
}

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('symptomAnalysisForm');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const textarea = document.getElementById('symptomInput');
      const resultDiv = document.getElementById('symptomAnalysisResult');
      const symptoms = textarea.value.trim();
      if (!symptoms) {
        textarea.classList.add('invalid');
        return;
      } else {
        textarea.classList.remove('invalid');
      }
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = '<span style="color:#667eea;">Analyzing symptoms, please wait...</span>';
      try {
        const token = sessionStorage.getItem('mc_token');
        const resp = await fetch(`${window.__API_BASE}/api/health-assessments/symptom-analysis`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ symptoms })
        });
        const data = await resp.json();
        if (resp.ok && data.analysis) {
          resultDiv.innerHTML = `<div style='white-space:pre-line;font-size:16px;margin-bottom:8px;'>${data.analysis}</div><div style='color:#718096;font-size:13px;margin-top:8px;'>${data.disclaimer}</div>`;
        } else {
          resultDiv.innerHTML = `<span style='color:#e53e3e;'>${data.error || 'Failed to analyze symptoms.'}</span>`;
        }
      } catch (err) {
        resultDiv.innerHTML = `<span style='color:#e53e3e;'>Network error. Please try again later.</span>`;
      }
    });
  }
});

document.addEventListener('DOMContentLoaded', function() {
  const recordForm = document.getElementById('uploadRecordForm');
  if (recordForm) {
    recordForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const token = sessionStorage.getItem('mc_token');
      const formData = new FormData(recordForm);

      try {
        const resp = await fetch(`${window.__API_BASE}/api/records/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        const data = await resp.json();
        if (resp.ok) {
          alert('Medical record uploaded successfully!');
          closeModal('uploadRecordModal');
          loadMedicalRecords();
        } else {
          alert(data.error || 'Upload failed. Please check your file and details.');
        }
      } catch (err) {
        alert('Network error. Please try again.');
      }
    });
  }
});