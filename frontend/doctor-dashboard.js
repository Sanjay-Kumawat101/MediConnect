// Minimal doctor dashboard logic
document.addEventListener('DOMContentLoaded', function() {
  window.__API_BASE = window.__API_BASE || (window.location.protocol === 'file:' ? 'http://localhost:4000' : '');
  initDoctor();
});

function initDoctor() {
  const token = sessionStorage.getItem('mc_token');
  const user = JSON.parse(sessionStorage.getItem('mc_user') || '{}');
  if (!token || user.role !== 'doctor') {
    window.location.href = 'index.html';
    return;
  }
  document.getElementById('userName').textContent = user.name || 'Doctor';
  document.getElementById('userRole').textContent = 'Doctor';
  bindNav();
  loadAppointments();
  bindAvailability();
}

function bindNav() {
  document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const tab = this.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      const el = document.getElementById(`${tab}Content`);
      if (el) el.style.display = 'block';
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

function logout() {
  sessionStorage.removeItem('mc_token');
  sessionStorage.removeItem('mc_user');
  window.location.href = 'index.html';
}

function refreshAppointments() {
  loadAppointments();
}

function loadAppointments() {
  const token = sessionStorage.getItem('mc_token');
  fetch(`${window.__API_BASE}/api/appointments`, { headers: { Authorization: `Bearer ${token}` }})
    .then(r => r.json())
    .then(list => {
      const container = document.getElementById('docAppointmentsList');
      if (!container) return;
      container.innerHTML = '';
      let pending = 0, upcoming = 0, cancelled = 0;
      (list || []).forEach(ap => {
        if (ap.status === 'pending') pending++; else if (ap.status === 'upcoming') upcoming++; else if (ap.status === 'cancelled') cancelled++;
        const row = document.createElement('div');
        row.className = 'appointment-card';
        row.innerHTML = `
          <div class="appointment-left">
            <div class="doctor-avatar"><span>👤</span></div>
            <div class="appointment-details">
              <div class="doctor-name">Patient: ${ap.user_id || ''}</div>
              <div class="specialization">Date: ${ap.date} • Time: ${ap.time}</div>
              <div class="appointment-reason">${ap.reason || ''}</div>
            </div>
          </div>
          <div class="appointment-right">
            <div class="appointment-status ${ap.status === 'upcoming' ? 'status-upcoming' : ap.status === 'cancelled' ? 'status-cancelled' : ''}">${ap.status}</div>
            <div class="appointment-actions">
              <button class="action-btn-small btn-primary" data-action="confirm" data-id="${ap.id}">Confirm</button>
              <button class="action-btn-small btn-danger" data-action="cancel" data-id="${ap.id}">Cancel</button>
            </div>
          </div>`;
        container.appendChild(row);
      });
      setStat('statPending', pending);
      setStat('statUpcoming', upcoming);
      setStat('statCancelled', cancelled);
      container.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', onApptAction);
      });
    })
    .catch(() => {});
}

function setStat(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(val);
}

function onApptAction(e) {
  const action = e.currentTarget.getAttribute('data-action');
  const id = e.currentTarget.getAttribute('data-id');
  const token = sessionStorage.getItem('mc_token');
  const updates = action === 'confirm' ? { status: 'upcoming' } : { status: 'cancelled' };
  fetch(`${window.__API_BASE}/api/appointments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(updates)
  }).then(() => loadAppointments());
}

function bindAvailability() {
  const form = document.getElementById('availabilityForm');
  if (!form) return;
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const date = document.getElementById('availDate').value;
    const time = document.getElementById('availTime').value;
    if (!date || !time) { alert('Select date and time'); return; }
    const notes = document.getElementById('availNotes').value;
    const token = sessionStorage.getItem('mc_token');
    fetch(`${window.__API_BASE}/api/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date, time, notes })
    }).then(r => r.json()).then(resp => {
      if (resp && !resp.error) {
        alert('Availability added');
        form.reset();
      } else {
        alert(resp.error || 'Failed to add availability');
      }
    }).catch(() => alert('Failed to add availability'));
  });
}


