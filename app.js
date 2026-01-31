// ============================================
// C.I.D COURTROOM EVIDENCE PORTAL - APP.JS
// ============================================

// User accounts - username: { password, canEdit }
// You can add more accounts here
const userAccounts = {
    'KeNaN77': { password: '0912309K', canEdit: true, displayName: 'Delta' },
    'Dutch': { password: 'CharlieDutch', canEdit: true, displayName: 'Charlie' },
    'Relex': { password: 'RelexAdmin', canEdit: true, displayName: 'Relex' },
    'editor': { password: 'editor123', canEdit: true, displayName: 'Editor' },
    'viewer': { password: 'viewer123', canEdit: false, displayName: 'Viewer' }
};

// Current logged in user
let currentUser = null;

// Data storage
let evidenceData = {
    photos: [],
    videos: [],
    text: [],
    criminals: []
};

let currentType = 'photo';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadSession();
    setupNavigation();
    updateStats();
    setDefaultDate();
    updateUIForAuth();
});

// Load data from Server
function loadData() {
    fetch('/api/evidence')
        .then(response => response.json())
        .then(data => {
            evidenceData = data;
            renderAll();
            updateStats();
        })
        .catch(err => {
            console.error('Error loading data:', err);
            // Fallback to local storage if server fails (e.g. running locally without server)
            const saved = localStorage.getItem('cidEvidence');
            if (saved) {
                evidenceData = JSON.parse(saved);
                renderAll();
            }
        });
}

// Save data to Server
function saveData() {
    fetch('/api/evidence', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(evidenceData)
    })
        .catch(err => console.error('Error saving data:', err));

    // Also save to localStorage as backup
    localStorage.setItem('cidEvidence', JSON.stringify(evidenceData));
    updateStats();
}

// Setup navigation
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;

            // Update nav active state
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show corresponding section
            const sections = document.querySelectorAll('.evidence-section');
            sections.forEach(s => s.classList.remove('active'));

            const targetSection = document.getElementById(section);
            if (targetSection) {
                targetSection.classList.add('active');
                // Scroll to section
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// Update statistics
function updateStats() {
    document.getElementById('photoCount').textContent = evidenceData.photos.length;
    document.getElementById('videoCount').textContent = evidenceData.videos.length;
    document.getElementById('criminalCount').textContent = evidenceData.criminals.length;

    // Animate numbers
    animateNumbers();
}

function animateNumbers() {
    const numbers = document.querySelectorAll('.stat-number');
    numbers.forEach(num => {
        const target = parseInt(num.textContent);
        let current = 0;
        const increment = target / 20;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                num.textContent = target;
                clearInterval(timer);
            } else {
                num.textContent = Math.floor(current);
            }
        }, 30);
    });
}

// Set default date to today
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('evidenceDate').value = today;
}

// Modal functions
function openModal(type) {
    currentType = type;
    const modal = document.getElementById('modalOverlay');
    const criminalFields = document.getElementById('criminalFields');
    const urlGroup = document.getElementById('urlGroup');
    const thumbnailGroup = document.getElementById('thumbnailGroup');
    const modalTitle = document.getElementById('modalTitle');

    // Reset form
    document.getElementById('evidenceForm').reset();
    setDefaultDate();

    // Configure modal based on type
    switch (type) {
        case 'photo':
            modalTitle.textContent = 'Add Photo Evidence';
            criminalFields.style.display = 'none';
            urlGroup.style.display = 'block';
            thumbnailGroup.style.display = 'none';
            document.querySelector('#urlGroup label').textContent = 'Image URL';
            break;
        case 'video':
            modalTitle.textContent = 'Add Video Evidence';
            criminalFields.style.display = 'none';
            urlGroup.style.display = 'block';
            thumbnailGroup.style.display = 'block';
            document.querySelector('#urlGroup label').textContent = 'Video URL';
            break;
        case 'text':
            modalTitle.textContent = 'Add Text Evidence';
            criminalFields.style.display = 'none';
            urlGroup.style.display = 'none';
            thumbnailGroup.style.display = 'none';
            break;
        case 'criminal':
            modalTitle.textContent = 'Add Criminal Profile';
            criminalFields.style.display = 'block';
            urlGroup.style.display = 'none';
            thumbnailGroup.style.display = 'none';
            break;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

// Handle form submission
function handleSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const title = form.title.value;
    const description = form.description.value;
    const date = form.date.value;
    const url = form.url?.value || '';

    const id = Date.now();

    switch (currentType) {
        case 'photo':
            evidenceData.photos.push({ id, title, description, url, date });
            saveData();
            renderAll();
            closeModal();
            break;
        case 'video':
            const manualThumbnail = form.thumbnail?.value || '';
            if (manualThumbnail) {
                // Use manual thumbnail if provided
                evidenceData.videos.push({ id, title, description, url, thumbnail: manualThumbnail, date });
                saveData();
                renderAll();
                closeModal();
            } else if (url) {
                // Auto-generate thumbnail from video
                generateVideoThumbnail(url, (autoThumbnail) => {
                    evidenceData.videos.push({ id, title, description, url, thumbnail: autoThumbnail, date });
                    saveData();
                    renderAll();
                    closeModal();
                });
            } else {
                evidenceData.videos.push({ id, title, description, url, thumbnail: '', date });
                saveData();
                renderAll();
                closeModal();
            }
            return; // Don't call save/render/close here, done in callbacks
        case 'text':
            evidenceData.text.push({ id, title, content: description, date });
            break;
        case 'criminal':
            const age = form.age.value;
            const charges = form.charges.value;
            const status = form.status.value;
            const photo = form.photo.value;
            evidenceData.criminals.push({ id, name: title, age, charges, status, photo, description, date });
            break;
    }

    saveData();
    renderAll();
    closeModal();
}

// Generate thumbnail from video's first frame
function generateVideoThumbnail(videoUrl, callback) {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = true;

    video.addEventListener('loadeddata', () => {
        // Seek to 1 second or start of video
        video.currentTime = Math.min(1, video.duration);
    });

    video.addEventListener('seeked', () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
            callback(thumbnailUrl);
        } catch (e) {
            // If CORS fails, just use empty thumbnail
            console.log('Could not generate thumbnail:', e);
            callback('');
        }
    });

    video.addEventListener('error', () => {
        console.log('Video load error, using empty thumbnail');
        callback('');
    });

    video.load();
}

// Render all sections
function renderAll() {
    renderPhotos();
    renderVideos();
    renderCriminals();
}

// Render photos
function renderPhotos() {
    const grid = document.getElementById('photosGrid');

    if (evidenceData.photos.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><img src="icons/photo.png" alt="" class="icon-large"></div>
                <h3>No Photos Added Yet</h3>
                <p>Click "Add Photo" to upload photographic evidence</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = evidenceData.photos.map(photo => `
        <div class="evidence-card" onclick="viewEvidence('photo', ${photo.id})">
            <img class="evidence-card-image" src="${photo.url || 'https://via.placeholder.com/400x200/1a1a24/3f3f46?text=No+Image'}" alt="${photo.title}" onerror="this.src='https://via.placeholder.com/400x200/1a1a24/3f3f46?text=No+Image'">
            <div class="evidence-card-content">
                <h3 class="evidence-card-title">${photo.title}</h3>
                <p class="evidence-card-description">${photo.description || 'No description provided'}</p>
                <div class="evidence-card-meta">
                    <span class="evidence-card-date"><img src="icons/calendar.png" alt="" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${formatDate(photo.date)}</span>
                    <div class="evidence-card-actions">
                        <button class="action-btn delete" onclick="event.stopPropagation(); deleteEvidence('photos', ${photo.id})" title="Delete"><img src="icons/delete.png" alt="Delete" style="width: 14px; height: 14px;"></button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Render videos
function renderVideos() {
    const grid = document.getElementById('videosGrid');

    if (evidenceData.videos.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><img src="icons/video.png" alt="" class="icon-large"></div>
                <h3>No Videos Added Yet</h3>
                <p>Click "Add Video" to upload video evidence</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = evidenceData.videos.map(video => `
        <div class="evidence-card" onclick="viewEvidence('video', ${video.id})">
            <div class="video-thumbnail">
                <video class="evidence-card-image" src="${video.url}" muted preload="metadata" onloadeddata="this.currentTime=1"></video>
                <div class="play-overlay"><img src="icons/play.png" alt="Play" style="width: 48px; height: 48px;"></div>
            </div>
            <div class="evidence-card-content">
                <h3 class="evidence-card-title">${video.title}</h3>
                <p class="evidence-card-description">${video.description || 'No description provided'}</p>
                <div class="evidence-card-meta">
                    <span class="evidence-card-date"><img src="icons/calendar.png" alt="" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${formatDate(video.date)}</span>
                    <div class="evidence-card-actions">
                        <button class="action-btn delete" onclick="event.stopPropagation(); deleteEvidence('videos', ${video.id})" title="Delete"><img src="icons/delete.png" alt="Delete" style="width: 14px; height: 14px;"></button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Render text evidence
function renderText() {
    const list = document.getElementById('textList');
    if (!list) return; // Text section was removed

    if (evidenceData.text.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><img src="icons/document.png" alt="" class="icon-large"></div>
                <h3>No Documents Added Yet</h3>
                <p>Click "Add Document" to upload text evidence</p>
            </div>
        `;
        return;
    }

    list.innerHTML = evidenceData.text.map(text => `
        <div class="text-card" onclick="viewEvidence('text', ${text.id})">
            <div class="text-card-header">
                <h3 class="text-card-title">📄 ${text.title}</h3>
                <span class="text-card-date">${formatDate(text.date)}</span>
            </div>
            <div class="text-card-content">${truncateText(text.content, 300)}</div>
            <div class="evidence-card-meta" style="margin-top: 16px;">
                <span></span>
                <div class="evidence-card-actions">
                    <button class="action-btn delete" onclick="event.stopPropagation(); deleteEvidence('text', ${text.id})" title="Delete">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Render criminals
function renderCriminals() {
    const grid = document.getElementById('criminalsGrid');

    if (evidenceData.criminals.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><img src="icons/criminal.png" alt="" class="icon-large"></div>
                <h3>No Criminals Added Yet</h3>
                <p>Click "Add Criminal" to add criminal profiles</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = evidenceData.criminals.map(criminal => `
        <div class="criminal-card" onclick="viewEvidence('criminal', ${criminal.id})">
            <img class="criminal-photo" src="${criminal.photo || 'https://via.placeholder.com/400x220/1a1a24/3f3f46?text=No+Photo'}" alt="${criminal.name}" onerror="this.src='https://via.placeholder.com/400x220/1a1a24/3f3f46?text=No+Photo'">
            <div class="criminal-info">
                <h3 class="criminal-name">${criminal.name}</h3>
                <p class="criminal-charges">${criminal.charges || 'Charges pending'}</p>
                <div class="criminal-details">
                    <span class="criminal-detail"><img src="icons/criminal.png" alt="" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> Age: ${criminal.age || 'Unknown'}</span>
                    <span class="criminal-detail"><img src="icons/calendar.png" alt="" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${formatDate(criminal.date)}</span>
                </div>
                <span class="status-badge status-${criminal.status.toLowerCase()}">${criminal.status}</span>
                <div class="evidence-card-meta" style="margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 12px;">
                    <span></span>
                    <div class="evidence-card-actions">
                        <button class="action-btn delete" onclick="event.stopPropagation(); deleteEvidence('criminals', ${criminal.id})" title="Delete"><img src="icons/delete.png" alt="Delete" style="width: 14px; height: 14px;"></button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// View evidence in modal
function viewEvidence(type, id) {
    const modal = document.getElementById('viewModalOverlay');
    const content = document.getElementById('viewModalContent');

    let item;
    switch (type) {
        case 'photo':
            item = evidenceData.photos.find(p => p.id === id);
            content.innerHTML = `
                <img src="${item.url || 'https://via.placeholder.com/800x500/1a1a24/3f3f46?text=No+Image'}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/800x500/1a1a24/3f3f46?text=No+Image'">
                <div class="view-modal-info">
                    <h2>${item.title}</h2>
                    <p style="margin-bottom: 16px;">${item.description || 'No description provided'}</p>
                    <p style="color: var(--text-muted); font-size: 0.9rem;"><img src="icons/calendar.png" alt="" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> Date: ${formatDate(item.date)}</p>
                </div>
            `;
            break;
        case 'video':
            item = evidenceData.videos.find(v => v.id === id);
            content.innerHTML = `
                <video controls style="width: 100%; background: black;">
                    <source src="${item.url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <div class="view-modal-info">
                    <h2>${item.title}</h2>
                    <p style="margin-bottom: 16px;">${item.description || 'No description provided'}</p>
                    <p style="color: var(--text-muted); font-size: 0.9rem;"><img src="icons/calendar.png" alt="" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> Date: ${formatDate(item.date)}</p>
                </div>
            `;
            break;
        case 'text':
            item = evidenceData.text.find(t => t.id === id);
            content.innerHTML = `
                <div class="view-modal-info">
                    <h2>${item.title}</h2>
                    <p style="margin-bottom: 16px; white-space: pre-wrap; line-height: 1.8;">${item.content}</p>
                    <p style="color: var(--text-muted); font-size: 0.9rem;"><img src="icons/calendar.png" alt="" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> Date: ${formatDate(item.date)}</p>
                </div>
            `;
            break;
        case 'criminal':
            item = evidenceData.criminals.find(c => c.id === id);
            content.innerHTML = `
                <img src="${item.photo || 'https://via.placeholder.com/800x400/1a1a24/3f3f46?text=No+Photo'}" alt="${item.name}" style="max-height: 400px;" onerror="this.src='https://via.placeholder.com/800x400/1a1a24/3f3f46?text=No+Photo'">
                <div class="view-modal-info">
                    <h2>${item.name}</h2>
                    <p style="color: var(--primary); font-weight: 600; margin-bottom: 12px;">${item.charges || 'Charges pending'}</p>
                    <div style="display: flex; gap: 24px; margin-bottom: 16px; flex-wrap: wrap;">
                        <span style="color: var(--text-secondary);"><img src="icons/criminal.png" alt="" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> Age: ${item.age || 'Unknown'}</span>
                        <span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span>
                    </div>
                    <p style="margin-bottom: 16px; color: var(--text-secondary);">${item.description || 'No additional information'}</p>
                    <p style="color: var(--text-muted); font-size: 0.9rem;"><img src="icons/calendar.png" alt="" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> Added: ${formatDate(item.date)}</p>
                </div>
            `;
            break;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeViewModal() {
    document.getElementById('viewModalOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

// Delete evidence
function deleteEvidence(type, id) {
    if (confirm('Are you sure you want to delete this evidence? This action cannot be undone.')) {
        evidenceData[type] = evidenceData[type].filter(item => item.id !== id);
        saveData();
        renderAll();
    }
}

// Utility functions
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function truncateText(text, maxLength) {
    if (!text) return 'No content';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Close modals on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeViewModal();
        closeLoginModal();
    }
});

// Close modals on overlay click
document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') closeModal();
});

document.getElementById('viewModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'viewModalOverlay') closeViewModal();
});

document.getElementById('loginModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'loginModalOverlay') closeLoginModal();
});

// ============================================
// AUTHENTICATION SYSTEM
// ============================================

// Load session from localStorage
function loadSession() {
    const savedUser = localStorage.getItem('cidCurrentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
}

// Save session to localStorage
function saveSession() {
    if (currentUser) {
        localStorage.setItem('cidCurrentUser', JSON.stringify(currentUser));
    } else {
        localStorage.removeItem('cidCurrentUser');
    }
}

// Open login modal
function openLoginModal() {
    const modal = document.getElementById('loginModalOverlay');
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').style.display = 'none';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close login modal
function closeLoginModal() {
    const modal = document.getElementById('loginModalOverlay');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Handle login form submission
function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    // Check if user exists
    if (userAccounts[username]) {
        // Check password
        if (userAccounts[username].password === password) {
            // Login successful
            currentUser = {
                username: username,
                displayName: userAccounts[username].displayName,
                canEdit: userAccounts[username].canEdit
            };
            saveSession();
            closeLoginModal();
            updateUIForAuth();
            renderAll(); // Re-render to show/hide edit buttons
        } else {
            errorEl.textContent = 'Incorrect password. Please try again.';
            errorEl.style.display = 'block';
        }
    } else {
        errorEl.textContent = 'User not found. Please check your username.';
        errorEl.style.display = 'block';
    }
}

// Logout function
function logout() {
    currentUser = null;
    saveSession();
    updateUIForAuth();
    renderAll(); // Re-render to hide edit buttons
}

// Update UI based on authentication state
function updateUIForAuth() {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');

    if (currentUser) {
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        userName.textContent = currentUser.displayName;
    } else {
        loginBtn.style.display = 'flex';
        userInfo.style.display = 'none';
    }

    // Update add buttons visibility
    updateEditButtonsVisibility();
}

// Update edit buttons visibility based on permissions
function updateEditButtonsVisibility() {
    const canEdit = currentUser && currentUser.canEdit;
    const addButtons = document.querySelectorAll('.add-btn');

    addButtons.forEach(btn => {
        if (canEdit) {
            btn.style.display = 'flex';
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        } else {
            btn.style.display = 'none';
        }
    });
}

// Check if user can edit (used before any edit action)
function canUserEdit() {
    return currentUser && currentUser.canEdit;
}

// Wrapper for openModal that checks permissions
const originalOpenModal = openModal;
openModal = function (type) {
    if (!canUserEdit()) {
        alert('You must be logged in with edit permissions to add evidence.');
        return;
    }
    originalOpenModal(type);
};

// Wrapper for deleteEvidence that checks permissions
const originalDeleteEvidence = deleteEvidence;
deleteEvidence = function (type, id) {
    if (!canUserEdit()) {
        alert('You must be logged in with edit permissions to delete evidence.');
        return;
    }
    originalDeleteEvidence(type, id);
};
