document.addEventListener('DOMContentLoaded', async function() {
  const applicationList = document.getElementById('doctorApplications');
  const message = document.getElementById('applicationMessage');
  if (!window.mcSupabase?.auth || !window.mcAuthReady) {
    message.textContent = 'Authentication did not load. Start the backend and open http://localhost:4000/admin-dashboard.html (not VS Code Live Server).';
    message.classList.add('error');
    return;
  }

  await window.mcAuthReady;
  if (!sessionStorage.getItem('mc_token')) {
    window.location.href = 'index.html';
    return;
  }

  let applications = [];
  let activeStatus = 'pending';

  function showError(error, fallback) {
    message.textContent = error?.message || fallback;
    message.classList.add('error');
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${sessionStorage.getItem('mc_token')}`
      }
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Administrator access is required. Sign in with the configured admin account.');
      }
      throw new Error(result.error || 'The request could not be completed.');
    }
    return result;
  }

  async function loadApplications() {
    const refreshButton = document.getElementById('refreshApplications');
    refreshButton.disabled = true;
    message.textContent = 'Loading doctor applications…';
    message.classList.remove('error');
    applicationList.replaceChildren();

    try {
      const [summary, list] = await Promise.all([
        fetchJson('/api/admin/summary'),
        fetchJson('/api/admin/doctors?status=all')
      ]);
      applications = list;
      document.getElementById('totalCount').textContent = summary.total;
      document.getElementById('pendingCount').textContent = summary.pending;
      document.getElementById('approvedCount').textContent = summary.approved;
      document.getElementById('rejectedCount').textContent = summary.rejected;
      renderApplications();
    } catch (error) {
      showError(error, 'Could not load doctor applications.');
    } finally {
      refreshButton.disabled = false;
    }
  }

  function renderApplications() {
    const searchTerm = document.getElementById('applicationSearch').value.trim().toLowerCase();
    const visibleApplications = applications.filter(application => {
      const matchesStatus = activeStatus === 'all' || application.approval_status === activeStatus;
      const searchText = [
        application.name,
        application.email,
        application.phone,
        application.specialization,
        application.license_number
      ].filter(Boolean).join(' ').toLowerCase();
      return matchesStatus && searchText.includes(searchTerm);
    });

    applicationList.replaceChildren();
    if (!visibleApplications.length) {
      const empty = document.createElement('div');
      empty.className = 'application-empty';
      const emptyMessage = searchTerm
        ? 'No applications match this search.'
        : `No ${activeStatus === 'all' ? '' : `${activeStatus} `}doctor applications to show.`;
      empty.textContent = emptyMessage;
      applicationList.appendChild(empty);
      message.textContent = searchTerm
        ? `No matching doctor applications.`
        : emptyMessage;
      return;
    }

    visibleApplications.forEach(application => applicationList.appendChild(createApplicationCard(application)));
    message.textContent = `Showing ${visibleApplications.length} of ${applications.length} doctor application${applications.length === 1 ? '' : 's'}.`;
  }

  function createApplicationCard(application) {
    const card = document.createElement('article');
    card.className = 'doctor-application';

    const heading = document.createElement('div');
    heading.className = 'doctor-card-heading';
    const initials = document.createElement('span');
    initials.className = 'doctor-initials';
    initials.setAttribute('aria-hidden', 'true');
    initials.textContent = (application.name || 'DR')
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();

    const title = document.createElement('div');
    title.className = 'doctor-title';
    const name = document.createElement('h3');
    name.textContent = application.name || 'Doctor application';
    const email = document.createElement('p');
    email.textContent = application.email || 'No email provided';
    title.append(name, email);

    const badge = document.createElement('span');
    badge.className = `application-status ${application.approval_status}`;
    badge.textContent = application.approval_status;
    heading.append(initials, title, badge);
    card.appendChild(heading);

    const details = document.createElement('dl');
    details.className = 'doctor-details';
    const fields = [
      ['Phone', application.phone],
      ['Specialization', application.specialization],
      ['License number', application.license_number],
      ['Submitted', application.created_at ? new Date(application.created_at).toLocaleDateString() : '—']
    ];
    fields.forEach(([label, value]) => {
      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      description.textContent = value || '—';
      details.append(term, description);
    });
    card.appendChild(details);

    if (application.approval_status === 'pending') {
      const actions = document.createElement('div');
      actions.className = 'application-actions';
      actions.append(
        createActionButton('Approve doctor', 'approved', 'action-btn btn-primary'),
        createActionButton('Reject', 'rejected', 'action-btn btn-reject')
      );
      card.appendChild(actions);

      function createActionButton(label, status, className) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = label;
        button.addEventListener('click', () => updateApplication(application, status, actions));
        return button;
      }
    }

    return card;
  }

  async function updateApplication(application, status, actions) {
    const decision = status === 'approved' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${decision} ${application.name || 'this doctor'}?`)) return;

    actions.querySelectorAll('button').forEach(button => { button.disabled = true; });
    message.textContent = `Saving ${decision} decision…`;
    message.classList.remove('error');

    try {
      await fetchJson(`/api/admin/doctors/${encodeURIComponent(application.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      await loadApplications();
    } catch (error) {
      showError(error, 'Could not update the doctor application.');
      actions.querySelectorAll('button').forEach(button => { button.disabled = false; });
    }
  }

  document.querySelectorAll('.status-filter').forEach(button => {
    button.addEventListener('click', () => {
      activeStatus = button.dataset.status;
      document.querySelectorAll('.status-filter').forEach(filter => {
        const isActive = filter === button;
        filter.classList.toggle('active', isActive);
        filter.setAttribute('aria-pressed', String(isActive));
      });
      renderApplications();
    });
  });

  document.getElementById('applicationSearch').addEventListener('input', renderApplications);
  document.getElementById('refreshApplications').addEventListener('click', loadApplications);
  document.getElementById('adminLogout').addEventListener('click', async event => {
    event.preventDefault();
    try {
      await window.mcSignOut();
    } catch (error) {
      showError(error, 'Could not sign out.');
    }
  });

  await loadApplications();
});
