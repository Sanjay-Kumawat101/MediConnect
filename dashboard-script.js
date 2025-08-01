// dashboard-script.js
    // Initialize dashboard
    document.addEventListener('DOMContentLoaded', function() {
      updateUserInfo();
      showTab('dashboard');
    });

    // Update user information
    function updateUserInfo() {
      document.getElementById('userName').textContent = currentUser.name;
      document.getElementById('userRole').textContent = currentUser.role;
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
        // In a real application, this would clear session and redirect
        alert('Logout functionality would be implemented here.');
        // window.location.href = '/login';
      }
    }

    // Responsive handling
    window.addEventListener('resize', function() {
      if (window.innerWidth > 1024) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('show');
      }
    });

    // Simulate real-time updates
    setInterval(function() {
      const timeElements = document.querySelectorAll('.activity-time');
      // In a real application, this would update with actual timestamps
    }, 60000);
