// Configuration
const CONFIG = {
    // Ganti dengan URL Web App Google Apps Script Anda
    API_BASE_URL: 'https://script.google.com/macros/s/AKfycbyVYM54u8IoRPIhCTaqgE0C7AWJsT36PbhztXo3feP1jOkTVMNBwEaC2_x_OcgxDmRP/exec',
    
    // Default values
    DEFAULT_DATE: new Date().toISOString().split('T')[0]
};

// Global state
let tasks = [];
let filteredTasks = [];
let currentTask = null;
let isLoading = false;
let tasksCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 seconds cache

// Search and filter state
let searchTerm = '';
let currentFilters = {
    platform: '',
    format: '',
    assignedTo: '',
    progress: ''
};
let currentSort = {
    by: 'no',
    order: 'asc'
};

// DOM elements
const elements = {
    // Stats
    totalTasks: document.getElementById('totalTasks'),
    onTimeTasks: document.getElementById('onTimeTasks'),
    nearDeadlineTasks: document.getElementById('nearDeadlineTasks'),
    overdueTasks: document.getElementById('overdueTasks'),
    
    // States
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    errorMessage: document.getElementById('errorMessage'),
    emptyState: document.getElementById('emptyState'),
    
    // Tables
    desktopTable: document.getElementById('desktopTable'),
    mobileCards: document.getElementById('mobileCards'),
    tasksTableBody: document.getElementById('tasksTableBody'),
    
    // Modals
    addTaskModal: document.getElementById('addTaskModal'),
    taskDetailModal: document.getElementById('taskDetailModal'),
    addTaskForm: document.getElementById('addTaskForm'),
    
    // Toast
    toastContainer: document.getElementById('toastContainer')
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set default date
    const dueDateInput = document.getElementById('dueDateInput');
    if (dueDateInput) {
        dueDateInput.min = CONFIG.DEFAULT_DATE;
    }
    
    // Load tasks
    loadTasks();
    
    // Setup event listeners
    setupEventListeners();

    // Init custom multi-selects for Platform, Format, Assigned To
    initMultiSelect('platformMs', 'platformInput', [
        'Instagram', 'Tiktok', 'Youtube'
    ], 'Pilih Platform');
    initMultiSelect('formatMs', 'formatInput', [
        'Feeds', 'Feeds (Grid)', 'Corrusel', 'Story', 'Video', 'Article'
    ], 'Pilih Format');
    initMultiSelect('assignedToMs', 'assignedToInput', [
        'Design Creator', 'Room Of Documentary', 'Relation And Archive', 'Jurnalism', 'Social Media'
    ], 'Pilih Assignee');

    // Scroll to top button
    const scrollBtn = document.getElementById('scrollTopBtn');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollBtn.classList.add('show');
        } else {
            scrollBtn.classList.remove('show');
        }
    });
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Theme toggle
    const themeBtn = document.getElementById('toggleThemeBtn');
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    themeBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        const mode = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        localStorage.setItem('theme', mode);
        themeBtn.innerHTML = mode === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });
    // Set correct icon initially
    themeBtn.innerHTML = document.documentElement.classList.contains('dark') ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function setupEventListeners() {
    // Add task form submission
    if (elements.addTaskForm) {
        elements.addTaskForm.addEventListener('submit', handleAddTask);
    }
    
    // Modal close on outside click
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
    
    // Modal close on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Handle window resize for responsive view with debouncing
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (tasks.length > 0) {
                renderTasks();
            }
        }, 150); // Debounce resize events
    });
}

// API Functions (JSONP-based to avoid CORS and allow Live Preview)
function jsonpRequest(url, params = {}) {
    return new Promise((resolve, reject) => {
        const callbackName = `jsonp_cb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        params.callback = callbackName;
        params._ts = String(Date.now());
        const query = new URLSearchParams(params).toString();
        const script = document.createElement('script');
        const fullUrl = `${url}?${query}`;

        window[callbackName] = (data) => {
            try {
                resolve(data);
            } finally {
                delete window[callbackName];
                script.remove();
            }
        };

        script.onerror = () => {
            delete window[callbackName];
            script.remove();
            reject(new Error('JSONP request failed'));
        };

        script.src = fullUrl;
        document.body.appendChild(script);
    });
}

async function getTasks() {
    return await jsonpRequest(CONFIG.API_BASE_URL, { action: 'getTasks' });
}

async function getTask(id) {
    return await jsonpRequest(CONFIG.API_BASE_URL, { action: 'getTask', id: String(id) });
}

async function createTask(taskData) {
    return await jsonpRequest(CONFIG.API_BASE_URL, { action: 'createTask', data: JSON.stringify(taskData) });
}

async function updateTask(id, taskData) {
    return await jsonpRequest(CONFIG.API_BASE_URL, { action: 'updateTask', id: String(id), data: JSON.stringify(taskData) });
}

async function apiDeleteTask(id) {
    return await jsonpRequest(CONFIG.API_BASE_URL, { action: 'deleteTask', id: String(id) });
}

// Task Management Functions
async function loadTasks(forceRefresh = false) {
    if (isLoading) return;
    
    // Check cache first
    const now = Date.now();
    if (!forceRefresh && tasksCache && (now - cacheTimestamp) < CACHE_DURATION) {
        tasks = tasksCache;
        renderTasks();
        updateStats();
        return;
    }
    
    try {
        isLoading = true;
        showLoadingState();
        
        tasks = await getTasks();
        // Saring baris kosong dari spreadsheet (yang tidak punya konten berarti)
        tasks = (tasks || []).filter(t => t && (
            (t.task && String(t.task).trim() !== '') ||
            (t.platform && String(t.platform).trim() !== '') ||
            (t.format && String(t.format).trim() !== '') ||
            (t.assignedTo && String(t.assignedTo).trim() !== '') ||
            (t.dueDate && String(t.dueDate).trim() !== '')
        ));
        
        // Update cache
        tasksCache = tasks;
        cacheTimestamp = now;
        
        // Apply current filters and search
        applyFiltersAndSearch();
        updateStats();
        renderTasks();
        
        hideAllStates();
        
    } catch (error) {
        console.error('Failed to load tasks:', error);
        showErrorState('Gagal memuat data tasks');
    } finally {
        isLoading = false;
    }
}

async function refreshTasks() {
    await loadTasks();
}

function updateStats() {
    const tasksToCount = filteredTasks.length > 0 ? filteredTasks : tasks;
    const total = tasksToCount.length;
    const onTime = tasksToCount.filter(task => task.dateLeft >= 0).length;
    const nearDeadline = tasksToCount.filter(task => task.dateLeft >= 0 && task.dateLeft <= 3).length;
    const overdue = tasksToCount.filter(task => task.dateLeft < 0).length;
    
    elements.totalTasks.textContent = total;
    elements.onTimeTasks.textContent = onTime;
    elements.nearDeadlineTasks.textContent = nearDeadline;
    elements.overdueTasks.textContent = overdue;
}

function renderTasks() {
    const tasksToRender = filteredTasks.length > 0 ? filteredTasks : tasks;
    
    if (tasksToRender.length === 0) {
        showEmptyState();
        return;
    }
    
    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
        // Check if mobile view
        if (window.innerWidth <= 768) {
            renderMobileCards(tasksToRender);
            elements.desktopTable.style.display = 'none';
            elements.mobileCards.style.display = 'block';
        } else {
            renderDesktopTable(tasksToRender);
            elements.desktopTable.style.display = 'block';
            elements.mobileCards.style.display = 'none';
        }
    });
}

function renderDesktopTable(tasksToRender = tasks) {
    const tbody = elements.tasksTableBody;
    tbody.innerHTML = '';
    
    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    tasksToRender.forEach(task => {
        const row = createTableRow(task);
        fragment.appendChild(row);
    });
    tbody.appendChild(fragment);
}

function createTableRow(task) {
    const row = document.createElement('tr');
    if ((task.inProgress || '').toLowerCase() === 'done') {
        row.classList.add('row-done');
    }
    row.innerHTML = `
        <td>${task.no}</td>
        <td class="task-cell">${escapeHtml(task.task)}</td>
        <td>${escapeHtml(task.platform)}</td>
        <td>${escapeHtml(task.format)}</td>
        <td>${escapeHtml(task.assignedTo)}</td>
        <td>${formatDate(task.dueDate)}</td>
        <td>${createStatusBadge(task.dateLeft, task.inProgress)}</td>
        <td>${escapeHtml(task.inProgress)}</td>
    `;
    
    row.addEventListener('click', () => openTaskDetail(task.no));
    return row;
}

function renderMobileCards(tasksToRender = tasks) {
    const container = elements.mobileCards;
    container.innerHTML = '';
    
    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    tasksToRender.forEach(task => {
        const card = createMobileCard(task);
        fragment.appendChild(card);
    });
    container.appendChild(fragment);
}

function createMobileCard(task) {
    const card = document.createElement('div');
    card.className = 'mobile-card' + (((task.inProgress || '').toLowerCase() === 'done') ? ' row-done' : '');
    card.innerHTML = `
        <div class="mobile-card-header">
            <div class="mobile-card-title">#${task.no}</div>
            <div class="mobile-card-status">${createStatusBadge(task.dateLeft, task.inProgress)}</div>
        </div>
        <div class="mobile-card-content">
            <p>${escapeHtml(task.task)}</p>
        </div>
        <div class="mobile-card-meta">
            <span>${escapeHtml(task.platform)}</span>
            <span>•</span>
            <span>${escapeHtml(task.format)}</span>
            <span>•</span>
            <span>${escapeHtml(task.assignedTo)}</span>
        </div>
        <div class="mobile-card-date">
            Due: ${formatDate(task.dueDate)}
        </div>
    `;
    
    card.addEventListener('click', () => openTaskDetail(task.no));
    return card;
}

// Modal Functions
function openAddTaskModal() {
    elements.addTaskModal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Reset form
    elements.addTaskForm.reset();
    clearFormErrors();
}

function closeAddTaskModal() {
    elements.addTaskModal.classList.remove('show');
    document.body.style.overflow = '';
}

function openTaskDetail(taskNo) {
    // Tutup modal tambah jika sedang terbuka agar detail selalu di atas
    elements.addTaskModal.classList.remove('show');
    document.body.style.overflow = 'hidden';
    loadTaskDetail(taskNo);
    elements.taskDetailModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeTaskDetailModal() {
    elements.taskDetailModal.classList.remove('show');
    document.body.style.overflow = '';
    currentTask = null;
}

function closeAllModals() {
    closeAddTaskModal();
    closeTaskDetailModal();
}

async function loadTaskDetail(taskNo) {
    try {
        // Clear previous task data and show loading
        currentTask = null;
        clearTaskDetail();
        showFullScreenLoading('Memuat detail task...');
        
        currentTask = await getTask(taskNo);
        renderTaskDetail();
        hideAllStates();
    } catch (error) {
        console.error('Failed to load task detail:', error);
        showErrorState('Gagal memuat detail task');
    } finally {
        hideFullScreenLoading();
    }
}

function clearTaskDetail() {
    // Clear all detail fields
    const detailFields = [
        'detailTask', 'detailPlatform', 'detailFormat', 'detailAssignedTo',
        'detailDate', 'detailStatus', 'detailReference', 'detailResult', 'detailNotes'
    ];
    
    detailFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.textContent = '';
        }
    });
    
    // Clear modal title
    const titleElement = document.getElementById('taskDetailTitle');
    if (titleElement) {
        titleElement.textContent = 'Loading...';
    }
}

function renderTaskDetail() {
    if (!currentTask) return;
    
    // Update modal title
    document.getElementById('taskDetailTitle').textContent = `Task #${currentTask.no}`;
    
    // Update detail content
    document.getElementById('detailTask').textContent = currentTask.task || '-';
    document.getElementById('detailPlatform').textContent = currentTask.platform || '-';
    document.getElementById('detailFormat').textContent = currentTask.format || '-';
    document.getElementById('detailAssignedTo').textContent = currentTask.assignedTo || '-';
    document.getElementById('detailDueDate').textContent = formatDate(currentTask.dueDate) || '-';
    document.getElementById('detailInProgress').textContent = currentTask.inProgress || '-';
    document.getElementById('detailReference').innerHTML = currentTask.reference ? 
        `<a href="${currentTask.reference}" target="_blank" rel="noopener noreferrer">${currentTask.reference}</a>` : '-';
    document.getElementById('detailResult').textContent = currentTask.result || '-';
    document.getElementById('detailNotes').textContent = currentTask.notes || '-';
    
    // Update status badge
    const statusElement = document.getElementById('detailStatus');
    statusElement.innerHTML = createStatusBadge(currentTask.dateLeft, currentTask.inProgress);
}

// Form Functions
async function handleAddTask(e) {
    e.preventDefault();
    const taskData = collectFormData();
    
    // Validate form
    if (!validateTaskForm(taskData)) {
        return;
    }
    
    showFullScreenLoading('Menambahkan task baru...');
    
    try {
        const response = await createTask(taskData);
        console.log('Create task response:', response);
        
        // Check if response exists and has success indicator
        if (response && (response.message || response.success || response.id)) {
            showToast('Task berhasil ditambahkan', 'success');
            closeAddTaskModal();
            await loadTasks(true); // Force refresh to invalidate cache
        } else if (response && response.error) {
            showToast(response.error, 'error');
        } else {
            // If no error but also no clear success, assume success if we got a response
            showToast('Task berhasil ditambahkan', 'success');
            closeAddTaskModal();
            await loadTasks(true); // Force refresh to invalidate cache
        }
    } catch (error) {
        console.error('Failed to create task:', error);
        showToast('Gagal menambahkan task', 'error');
    } finally {
        hideFullScreenLoading();
    }
}

function validateTaskForm(data) {
    let isValid = true;
    clearFormErrors();
    
    // Required fields validation (platform and format are now optional)
    const requiredFields = ['task', 'assignedTo', 'dueDate', 'inProgress'];
    
    requiredFields.forEach(field => {
        if (!data[field] || String(data[field]).trim() === '') {
            showFieldError(field, `${field} harus diisi`);
            isValid = false;
        }
    });
    
    // Date validation
    if (data.dueDate) {
        const selectedDate = new Date(data.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            showFieldError('dueDate', 'Due date tidak boleh di masa lalu');
            isValid = false;
        }
    }
    
    return isValid;
}

function showFieldError(fieldName, message) {
    const errorElement = document.getElementById(`${fieldName}Error`);
    if (errorElement) {
        errorElement.textContent = message;
    }
}

function clearFormErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
        element.textContent = '';
    });
}

// Task Actions
async function editTask() {
    if (!currentTask) return;
    openEditTaskModal();
}

async function deleteTask() {
    if (!currentTask) return;
    
    if (!confirm('Apakah Anda yakin ingin menghapus task ini?')) {
        return;
    }
    
    showFullScreenLoading('Menghapus task...');
    
    try {
        const resp = await apiDeleteTask(currentTask.no);
        if (resp && resp.message) {
            showToast('Task berhasil dihapus', 'success');
            closeTaskDetailModal();
            closeAddTaskModal(); // Ensure add/edit modal is also closed
            await loadTasks(true); // Force refresh to invalidate cache
        } else {
            const msg = (resp && resp.error) ? resp.error : 'Gagal menghapus task';
            showToast(msg, 'error');
        }
    } catch (error) {
        console.error('Failed to delete task:', error);
        showToast('Gagal menghapus task', 'error');
    } finally {
        hideFullScreenLoading();
    }
}

// State Management Functions
function showLoadingState() {
    hideAllStates();
    elements.loadingState.style.display = 'flex';
}

function showErrorState(message) {
    hideAllStates();
    elements.errorMessage.textContent = message;
    elements.errorState.style.display = 'flex';
}

function showEmptyState() {
    hideAllStates();
    elements.emptyState.style.display = 'flex';
}

function hideAllStates() {
    elements.loadingState.style.display = 'none';
    elements.errorState.style.display = 'none';
    elements.emptyState.style.display = 'none';
}

// Utility Functions
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function createStatusBadge(dateLeft, progress) {
    if ((progress || '').toLowerCase() === 'done') {
        return `<span class="status-badge on-time">Done</span>`;
    }
    let className = 'status-badge ';
    let text = '';
    
    if (dateLeft < 0) {
        className += 'overdue';
        text = `${Math.abs(dateLeft)} hari terlambat`;
    } else if (dateLeft === 0) {
        className += 'near-deadline';
        text = 'Hari ini';
    } else if (dateLeft <= 3) {
        className += 'near-deadline';
        text = `${dateLeft} hari lagi`;
    } else {
        className += 'on-time';
        text = `${dateLeft} hari lagi`;
    }
    
    return `<span class="${className}">${text}</span>`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getMultiSelectValues(selectEl) {
    const values = [];
    if (!selectEl) return values;
    for (const option of selectEl.options) {
        if (option.selected) values.push(option.value);
    }
    return values;
}

// Build custom multi-select UI
function initMultiSelect(containerId, hiddenInputId, options, placeholder, preselectedValues = []) {
    const container = document.getElementById(containerId);
    const hidden = document.getElementById(hiddenInputId);
    if (!container || !hidden) return;

    const state = { selected: [...preselectedValues] };

    const control = document.createElement('div');
    control.className = 'ms-control';
    const placeholderEl = document.createElement('span');
    placeholderEl.className = 'ms-placeholder';
    placeholderEl.textContent = placeholder;
    control.appendChild(placeholderEl);

    const dropdown = document.createElement('div');
    dropdown.className = 'ms-dropdown';
    dropdown.style.display = 'none';

    function syncHidden() {
        hidden.value = state.selected.join(', ');
    }

    function renderTags() {
        control.innerHTML = '';
        if (state.selected.length === 0) {
            control.appendChild(placeholderEl);
        } else {
            state.selected.forEach(val => {
                const tag = document.createElement('span');
                tag.className = 'ms-tag';
                tag.innerHTML = `${escapeHtml(val)} <button type="button" aria-label="remove">✕</button>`;
                tag.querySelector('button').onclick = (e) => {
                    e.stopPropagation();
                    state.selected = state.selected.filter(v => v !== val);
                    syncHidden();
                    renderTags();
                    renderOptions();
                };
                control.appendChild(tag);
            });
        }
    }

    function renderOptions() {
        dropdown.innerHTML = '';
        options.forEach(opt => {
            const row = document.createElement('div');
            row.className = 'ms-option';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'ms-checkbox';
            cb.checked = state.selected.includes(opt);
            cb.onchange = () => {
                if (cb.checked) {
                    if (!state.selected.includes(opt)) state.selected.push(opt);
                } else {
                    state.selected = state.selected.filter(v => v !== opt);
                }
                syncHidden();
                renderTags();
            };
            const label = document.createElement('span');
            label.textContent = opt;
            row.appendChild(cb);
            row.appendChild(label);
            dropdown.appendChild(row);
        });
    }

    control.onclick = () => {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    };
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) dropdown.style.display = 'none';
    });

    container.appendChild(control);
    container.appendChild(dropdown);
    renderTags();
    renderOptions();
    syncHidden(); // Initialize hidden input value
}

function setMultiSelectValues(containerId, hiddenInputId, values) {
    const container = document.getElementById(containerId);
    const hidden = document.getElementById(hiddenInputId);
    if (!container || !hidden) return;
    
    // Re-init component with current options list and preselect values
    const options = Array.from(new Set([
        ...values,
        ...(containerId === 'platformMs' || containerId === 'platformMsEdit' ? ['Instagram','Tiktok','Youtube'] : []),
        ...(containerId === 'formatMs' || containerId === 'formatMsEdit' ? ['Feeds','Feeds (Grid)','Corrusel','Story','Video','Article'] : []),
        ...(containerId === 'assignedToMs' || containerId === 'assignedToMsEdit' ? ['Design Creator','Room Of Documentary','Relation And Archive','Jurnalism','Social Media'] : [])
    ]));
    
    
    container.innerHTML = '';
    const placeholder = containerId.includes('Edit') ? 
        (containerId.includes('platform') ? 'Pilih Platform' : 
         containerId.includes('format') ? 'Pilih Format' : 'Pilih Assignee') :
        (containerId === 'platformMs' ? 'Pilih Platform' : 
         containerId === 'formatMs' ? 'Pilih Format' : 'Pilih Assignee');
    initMultiSelect(containerId, hiddenInputId, options, placeholder, values);
}

function collectFormData() {
    const form = elements.addTaskForm;
    const fd = new FormData(form);
    return {
        task: fd.get('task'),
        platform: document.getElementById('platformInput').value,
        format: document.getElementById('formatInput').value,
        assignedTo: document.getElementById('assignedToInput').value,
        dueDate: fd.get('dueDate'),
        inProgress: fd.get('inProgress'),
        reference: fd.get('reference'),
        result: fd.get('result'),
        notes: fd.get('notes')
    };
}

// Global overlay toggler
function setOverlay(show) {
    const ov = document.getElementById('loadingOverlay');
    if (!ov) return;
    if (show) {
        ov.classList.add('show');
        ov.setAttribute('aria-hidden', 'false');
    } else {
        ov.classList.remove('show');
        ov.setAttribute('aria-hidden', 'true');
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fas fa-check-circle' :
                 type === 'error' ? 'fas fa-exclamation-circle' :
                 type === 'warning' ? 'fas fa-exclamation-triangle' :
                 'fas fa-info-circle';
    
    toast.innerHTML = `
        <div class="toast-content">
            <i class="toast-icon ${icon}"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// Global functions for HTML onclick handlers
window.openAddTaskModal = openAddTaskModal;
window.closeAddTaskModal = closeAddTaskModal;
window.closeTaskDetailModal = closeTaskDetailModal;
window.refreshTasks = refreshTasks;
window.editTask = editTask;
window.deleteTask = deleteTask;
window.openEditTaskModal = openEditTaskModal;
window.closeEditTaskModal = closeEditTaskModal;
window.handleSearch = handleSearch;
window.applyFilters = applyFilters;
window.applySorting = applySorting;

// Search, Filter, and Sort Functions
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    searchTerm = searchInput.value.toLowerCase().trim();
    applyFiltersAndSearch();
}

function applyFilters() {
    currentFilters.platform = document.getElementById('platformFilter').value;
    currentFilters.format = document.getElementById('formatFilter').value;
    currentFilters.assignedTo = document.getElementById('assignedToFilter').value;
    currentFilters.progress = document.getElementById('progressFilter').value;
    applyFiltersAndSearch();
}

function applySorting() {
    currentSort.by = document.getElementById('sortBy').value;
    currentSort.order = document.getElementById('sortOrder').value;
    applyFiltersAndSearch();
}

function applyFiltersAndSearch() {
    // Start with all tasks
    let result = [...tasks];
    
    // Apply search filter
    if (searchTerm) {
        result = result.filter(task => {
            const searchableText = [
                task.task || '',
                task.platform || '',
                task.format || '',
                task.assignedTo || '',
                task.inProgress || '',
                task.reference || '',
                task.result || '',
                task.notes || ''
            ].join(' ').toLowerCase();
            
            return searchableText.includes(searchTerm);
        });
    }
    
    // Apply filters
    if (currentFilters.platform) {
        result = result.filter(task => 
            (task.platform || '').toLowerCase().includes(currentFilters.platform.toLowerCase())
        );
    }
    
    if (currentFilters.format) {
        result = result.filter(task => 
            (task.format || '').toLowerCase().includes(currentFilters.format.toLowerCase())
        );
    }
    
    if (currentFilters.assignedTo) {
        result = result.filter(task => 
            (task.assignedTo || '').toLowerCase().includes(currentFilters.assignedTo.toLowerCase())
        );
    }
    
    if (currentFilters.progress) {
        result = result.filter(task => 
            (task.inProgress || '').toLowerCase() === currentFilters.progress.toLowerCase()
        );
    }
    
    // Apply sorting
    result.sort((a, b) => {
        let aValue, bValue;
        
        switch (currentSort.by) {
            case 'no':
                aValue = parseInt(a.no) || 0;
                bValue = parseInt(b.no) || 0;
                break;
            case 'task':
                aValue = (a.task || '').toLowerCase();
                bValue = (b.task || '').toLowerCase();
                break;
            case 'dueDate':
                aValue = new Date(a.dueDate || '1900-01-01');
                bValue = new Date(b.dueDate || '1900-01-01');
                break;
            case 'inProgress':
                aValue = (a.inProgress || '').toLowerCase();
                bValue = (b.inProgress || '').toLowerCase();
                break;
            case 'platform':
                aValue = (a.platform || '').toLowerCase();
                bValue = (b.platform || '').toLowerCase();
                break;
            default:
                aValue = a.no;
                bValue = b.no;
        }
        
        if (currentSort.order === 'desc') {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        } else {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        }
    });
    
    filteredTasks = result;
    updateStats();
    renderTasks();
}

// Edit task modal controls
function openEditTaskModal() {
    if (!currentTask) return;
    const modal = document.getElementById('editTaskModal');
    const form = document.getElementById('editTaskForm');
    
    // Preload values
    document.getElementById('taskInputEdit').value = currentTask.task || '';
    document.getElementById('dueDateInputEdit').value = currentTask.dueDate || '';
    document.getElementById('inProgressInputEdit').value = currentTask.inProgress || '';
    document.getElementById('referenceInputEdit').value = currentTask.reference || '';
    document.getElementById('resultInputEdit').value = currentTask.result || '';
    document.getElementById('notesInputEdit').value = currentTask.notes || '';
    
    // Set multi-select values (this will also initialize the components)
    setMultiSelectValues('platformMsEdit', 'platformInputEdit', (currentTask.platform || '').split(/\s*,\s*/).filter(Boolean));
    setMultiSelectValues('formatMsEdit', 'formatInputEdit', (currentTask.format || '').split(/\s*,\s*/).filter(Boolean));
    setMultiSelectValues('assignedToMsEdit', 'assignedToInputEdit', (currentTask.assignedTo || '').split(/\s*,\s*/).filter(Boolean));
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Remove any existing submit handler
    form.onsubmit = null;
    
    // Add new submit handler
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const payload = {
            task: document.getElementById('taskInputEdit').value,
            platform: document.getElementById('platformInputEdit').value,
            format: document.getElementById('formatInputEdit').value,
            assignedTo: document.getElementById('assignedToInputEdit').value,
            dueDate: document.getElementById('dueDateInputEdit').value,
            inProgress: document.getElementById('inProgressInputEdit').value,
            reference: document.getElementById('referenceInputEdit').value,
            result: document.getElementById('resultInputEdit').value,
            notes: document.getElementById('notesInputEdit').value,
        };
        
        if (!validateTaskForm(payload)) return;
        
        showFullScreenLoading('Menyimpan perubahan...');
        
        try {
            const response = await updateTask(currentTask.no, payload);
            console.log('Update task response:', response);
            
            // Check if response exists and has success indicator
            if (response && (response.message || response.success)) {
                showToast('Task berhasil diupdate', 'success');
                closeEditTaskModal();
                closeTaskDetailModal(); // Close detail modal too
                await loadTasks(true); // Force refresh to invalidate cache
            } else if (response && response.error) {
                showToast(response.error, 'error');
            } else {
                // If no error but also no clear success, assume success if we got a response
                showToast('Task berhasil diupdate', 'success');
                closeEditTaskModal();
                closeTaskDetailModal(); // Close detail modal too
                await loadTasks(true); // Force refresh to invalidate cache
            }
        } catch (err) {
            console.error('Failed to update task:', err);
            showToast('Gagal mengupdate task', 'error');
        } finally {
            hideFullScreenLoading();
        }
    });
}

function closeEditTaskModal() {
    const modal = document.getElementById('editTaskModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// Full screen loading functions
function showFullScreenLoading(message = 'Memuat data...') {
    const overlay = document.getElementById('fullScreenLoading');
    console.log('showFullScreenLoading called with message:', message);
    console.log('Overlay element:', overlay);
    if (overlay) {
        const messageEl = overlay.querySelector('p');
        if (messageEl) messageEl.textContent = message;
        overlay.style.display = 'flex';
        console.log('Loading overlay should be visible now');
    } else {
        console.error('fullScreenLoading element not found!');
    }
}

function hideFullScreenLoading() {
    const overlay = document.getElementById('fullScreenLoading');
    console.log('hideFullScreenLoading called');
    console.log('Overlay element:', overlay);
    if (overlay) {
        overlay.style.display = 'none';
        console.log('Loading overlay should be hidden now');
    } else {
        console.error('fullScreenLoading element not found!');
    }
}
