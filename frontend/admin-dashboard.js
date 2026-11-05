document.addEventListener('DOMContentLoaded', async function() {
  await window.mcAuthReady;
  const token = sessionStorage.getItem('mc_token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  const applicationList = document.getElementById('doctorApplications');
  const message = document.getElementById('applicationMessage');

  async function loadApplications() {
    message.textContent = 'Loading doctor applications…';
    message.classList.remove('error');
    applicationList.replaceChildren();

    try {
      const response = await fetch('/api/admin/doctors', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('mc_token')}` }
      });
      const applications = await response.json();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          message.textContent = 'Administrator access is required.';
          message.classList.add('error');
          return;
        }
        throw new Error(applications.error || 'Could not load doctor applications');
      }

      if (!applications.length) {
        message.textContent = 'There are no doctor applications waiting for verification.';
        return;
      }

      message.textContent = `${applications.length} doctor application${applications.length === 1 ? '' : 's'} awaiting review.`;
      applications.forEach(application => applicationList.appendChild(createApplicationCard(application)));
    } catch (error) {
      message.textContent = error.message || 'Could not load doctor applications.';
      message.classList.add('error');
    }
  }

  function createApplicationCard(application) {
    const card = document.createElement('article');
    card.className = 'dashboard-card doctor-application';

    const heading = document.createElement('h2');
    heading.textContent = application.name || 'Doctor application';
    card.appendChild(heading);

    const details = document.createElement('dl');
    const fields = [
      ['Email', application.email],
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

    const actions = document.createElement('div');
    actions.className = 'application-actions';
    actions.append(
      createActionButton('Approve', 'approved', 'action-btn btn-primary'),
      createActionButton('Reject', 'rejected', 'action-btn btn-reject')
    );
    card.appendChild(actions);

    function createActionButton(label, status, className) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.textContent = label;
      button.addEventListener('click', () => updateApplication(application.id, status, actions));
      return button;
    }

    return card;
  }

  async function updateApplication(id, status, actions) {
    actions.querySelectorAll('button').forEach(button => { button.disabled = true; });
    message.textContent = 'Saving verification decision…';
    message.classList.remove('error');

    try {
      const response = await fetch(`/api/admin/doctors/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('mc_token')}`
        },
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update the doctor application');
      await loadApplications();
    } catch (error) {
      message.textContent = error.message || 'Could not update the doctor application.';
      message.classList.add('error');
      actions.querySelectorAll('button').forEach(button => { button.disabled = false; });
    }
  }

  document.getElementById('refreshApplications').addEventListener('click', loadApplications);
  document.getElementById('adminLogout').addEventListener('click', async event => {
    event.preventDefault();
    try {
      await window.mcSignOut();
    } catch (error) {
      message.textContent = error.message || 'Could not sign out.';
      message.classList.add('error');
    }
  });

  await loadApplications();
});
