
// Global state
let currentLanguage = localStorage.getItem('mittiLanguage') || 'en';
let recording = false;
let mediaRecorder;
let audioChunks = [];
let speechRecognition;
let lastTranscription = '';

// Helpers to access shadow DOM inside components
function queryShadow(selector, innerSelector) {
    const host = document.querySelector(selector);
    if (!host) return null;
    return host.shadowRoot ? host.shadowRoot.querySelector(innerSelector) : null;
}

function queryAllShadow(selector, innerSelector) {
    const hosts = Array.from(document.querySelectorAll(selector));
    const results = [];
    hosts.forEach(h => {
        if (h.shadowRoot) {
            const el = h.shadowRoot.querySelector(innerSelector);
            if (el) results.push(el);
        }
    });
    return results;
}

// Core Functions
function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'hi' : 'en';
    localStorage.setItem('mittiLanguage', currentLanguage);
    updateLanguage();
}

async function toggleRecording() {
    // If already recording, stop everything
    if (recording) {
        // stop media recorder if active
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        // stop speech recognition if active
        if (speechRecognition) {
            try { speechRecognition.stop(); } catch (e) {}
        }
        recording = false;
        showToast(currentLanguage === 'en' ? 'Recording saved' : 'रिकॉर्डिंग सुरक्षित की गई');
        return;
    }

    // Start both MediaRecorder (for audio) and SpeechRecognition (for transcription) where available
    try {
        // Start audio capture
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            // Save last recording URL temporarily (not ideal for long term persistence)
            localStorage.setItem('lastRecording', audioUrl);
            audioChunks = [];
            // If transcription exists, also create a story entry automatically
            if (lastTranscription && lastTranscription.trim().length > 0) {
                const story = {
                    title: 'Voice Story',
                    content: lastTranscription,
                    author: localStorage.getItem('mittiAuthor') || 'You',
                    village: localStorage.getItem('mittiVillage') || '',
                    category: 'voice',
                    timestamp: new Date().toISOString()
                };
                let stories = JSON.parse(localStorage.getItem('mittiStories') || '[]');
                stories.unshift(story);
                localStorage.setItem('mittiStories', JSON.stringify(stories));
                // Update UI if on Share page
                if (document.getElementById('recentStories')) {
                    prependStoryToUI(story);
                }
            } else {
                // Save audio-only item to storage so user can access it later
                let audioItems = JSON.parse(localStorage.getItem('mittiAudio') || '[]');
                audioItems.unshift({ url: audioUrl, timestamp: new Date().toISOString() });
                localStorage.setItem('mittiAudio', JSON.stringify(audioItems));
            }
            lastTranscription = '';
        };
        mediaRecorder.start();
    } catch (err) {
        console.error('Error accessing microphone:', err);
        showToast(currentLanguage === 'en' ? 'Microphone access denied' : 'माइक्रोफ़ोन एक्सेस अस्वीकृत');
        return;
    }

    // Start Speech Recognition for live transcription (if supported)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (SpeechRecognition) {
        speechRecognition = new SpeechRecognition();
        speechRecognition.lang = currentLanguage === 'en' ? 'en-IN' : 'hi-IN';
        speechRecognition.interimResults = true;
        speechRecognition.continuous = true;
        lastTranscription = '';

        speechRecognition.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const res = event.results[i];
                if (res.isFinal) final += res[0].transcript;
                else interim += res[0].transcript;
            }
            // Update a live UI field if present
            const contentField = document.getElementById('content');
            if (contentField) {
                contentField.value = (final + ' ' + interim).trim();
            }
            lastTranscription = (final + ' ' + interim).trim();
        };

        speechRecognition.onerror = (e) => {
            console.warn('Speech recognition error', e);
        };

        try {
            speechRecognition.start();
        } catch (e) {
            console.warn('Could not start speech recognition', e);
        }
    } else {
        // If SpeechRecognition API not supported, let the user know
        showToast(currentLanguage === 'en' ? 'Speech recognition not supported in this browser' : 'आपके ब्राउज़र में स्पीच रिकग्निशन समर्थित नहीं है');
    }

    recording = true;
    showToast(currentLanguage === 'en' ? 'Recording started' : 'रिकॉर्डिंग शुरू हुई');
}

function handleFormSubmit(formId, storageKey, successMessage) {
    const form = document.getElementById(formId);
    if (!form) return;
    // prevent double initialization
    if (form.__mittiInitialized) return;
    form.__mittiInitialized = true;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.timestamp = new Date().toISOString();

        let items = JSON.parse(localStorage.getItem(storageKey) || '[]');
        items.unshift(data);
        localStorage.setItem(storageKey, JSON.stringify(items));

        showToast(successMessage);
        form.reset();
        if (formId === 'sellForm') {
            document.getElementById('sellModal')?.classList.add('hidden');
            // If on Bazaar page, also refresh UI
            const container = document.getElementById('bazaarItems');
            if (container) {
                renderBazaarItems();
            }
        }
        if (formId === 'answerForm') {
            document.getElementById('answerModal')?.classList.add('hidden');
            const container = document.getElementById('communityAnswers');
            if (container) {
                renderCommunityAnswers();
            }
        }
        if (formId === 'storyForm') {
            const container = document.getElementById('recentStories');
            if (container) {
                renderRecentStories();
            }
        }
    });
}

function updateLanguage() {
    document.querySelectorAll('[data-en], [data-hi]').forEach(element => {
        const newText = currentLanguage === 'en' 
            ? element.getAttribute('data-en') 
            : element.getAttribute('data-hi');
        if (newText) element.textContent = newText;
    });

    // Update any language toggle buttons inside shadow DOM of navbar components
    const navbarToggle = queryShadow('custom-navbar', '#languageToggle');
    if (navbarToggle) {
        navbarToggle.textContent = currentLanguage === 'en' ? 'हि' : 'EN';
    } else {
        // fallback for non-shadow DOM
        document.querySelectorAll('#languageToggle').forEach(toggle => {
            toggle.textContent = currentLanguage === 'en' ? 'हि' : 'EN';
        });
    }

    // Update bottom nav labels inside shadow DOM of bottom-nav
    const navLabels = Array.from(document.querySelectorAll('custom-bottom-nav')).map(h => {
        if (!h.shadowRoot) return [];
        return Array.from(h.shadowRoot.querySelectorAll('.nav-label'));
    }).flat();
    navLabels.forEach(label => {
        const newText = currentLanguage === 'en' ? label.getAttribute('data-en') : label.getAttribute('data-hi');
        if (newText) label.textContent = newText;
    });
}

function initLanguage() {
    updateLanguage();
    // Attach click using direct reference to shadow DOM button (replaces previous listeners)
    const navbarToggle = queryShadow('custom-navbar', '#languageToggle');
    if (navbarToggle) {
        navbarToggle.onclick = toggleLanguage;
    } else {
        document.querySelectorAll('#languageToggle').forEach(toggle => {
            toggle.onclick = toggleLanguage;
        });
    }
}

function initModals() {
    // Sell modal
    const sellModal = document.getElementById('sellModal');
    if (sellModal) {
        document.getElementById('sellBtn')?.addEventListener('click', () => {
            sellModal.classList.remove('hidden');
        });
        document.getElementById('closeModal')?.addEventListener('click', () => {
            sellModal.classList.add('hidden');
        });
        sellModal.addEventListener('click', (e) => {
            if (e.target === sellModal) sellModal.classList.add('hidden');
        });
    }

    // Answer modal
    const answerModal = document.getElementById('answerModal');
    if (answerModal) {
        document.getElementById('answerBtn')?.addEventListener('click', () => {
            answerModal.classList.remove('hidden');
        });
        document.getElementById('closeAnswerModal')?.addEventListener('click', () => {
            answerModal.classList.add('hidden');
        });
        answerModal.addEventListener('click', (e) => {
            if (e.target === answerModal) answerModal.classList.add('hidden');
        });
    }

    // Voice recording - override any previous handlers by setting onclick
    const voiceBtn = document.getElementById('voiceRecordBtn');
    if (voiceBtn) {
        voiceBtn.onclick = function(e) {
            e.preventDefault();
            toggleRecording();
        };
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-[#8b5cf6] text-white px-4 py-2 rounded-lg shadow-lg animate-fadeIn';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function initActiveNav() {
    const currentPath = window.location.pathname.split('/').pop() || 'home.html';
    document.querySelectorAll('custom-bottom-nav').forEach(host => {
        if (!host.shadowRoot) return;
        const items = host.shadowRoot.querySelectorAll('.nav-item');
        items.forEach(item => {
            const href = item.getAttribute('href');
            // our nav uses anchor tags in light DOM inside shadowRoot; fallback to using label text
            const label = item.querySelector('.nav-label');
            const labelText = label ? label.textContent.toLowerCase() : '';
            item.classList.toggle('active', currentPath.includes(labelText) || (href && currentPath.includes(href.replace('.html',''))));
        });
    });
}

// Rendering helpers for pages
function renderRecentStories() {
    const recentStories = JSON.parse(localStorage.getItem('mittiStories') || '[]');
    const container = document.getElementById('recentStories');
    if (!container) return;
    container.innerHTML = '';
    if (recentStories.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No stories shared yet. Be the first to share!</p>';
        return;
    }
    recentStories.slice(0, 3).forEach(story => {
        prependStoryToUI(story, false);
    });
}

function prependStoryToUI(story, toTop = true) {
    const container = document.getElementById('recentStories');
    if (!container) return;
    const html = `
        <div class="border-l-4 border-[#8b5cf6] pl-4 py-2">
            <h3 class="font-medium">${story.title}</h3>
            <p class="text-sm text-gray-600">${(story.content || '').substring(0, 60)}...</p>
            <div class="flex items-center mt-2">
                <div class="w-6 h-6 rounded-full bg-[#f59e0b] flex items-center justify-center text-white text-xs">${(story.author||'U').charAt(0)}</div>
                <div class="ml-2">
                    <p class="text-xs font-medium">${story.author || 'Unknown'}</p>
                    <p class="text-xs text-gray-500">${story.village || ''}</p>
                </div>
                <div class="ml-4 flex gap-2">
                    <button class="copy-story-btn px-2 py-1 text-xs bg-gray-100 rounded">Copy</button>
                </div>
            </div>
        </div>
    `;
    if (toTop) container.innerHTML = html + container.innerHTML;
    else container.innerHTML += html;

    // Attach copy handler to the top-most copy button we just added
    const btn = container.querySelector('.copy-story-btn');
    if (btn) {
        btn.onclick = () => {
            const dummy = document.createElement('textarea');
            dummy.value = story.title + '\n\n' + (story.content || '');
            document.body.appendChild(dummy);
            dummy.select();
            document.execCommand('copy');
            dummy.remove();
            showToast(currentLanguage === 'en' ? 'Copied to clipboard' : 'क्लिपबोर्ड पर कॉपी किया गया');
        };
    }
}

function renderBazaarItems() {
    const items = JSON.parse(localStorage.getItem('mittiProducts') || '[]');
    const container = document.getElementById('bazaarItems');
    if (!container) return;
    container.innerHTML = '';
    items.forEach(product => {
        container.innerHTML += `
            <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all">
                <div class="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <span class="text-gray-400">Product Image</span>
                </div>
                <div class="p-6">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="text-lg font-medium">${product.productName || product.name}</h3>
                        <span class="bg-[#06b6d4] text-white text-sm font-medium px-2 py-1 rounded-full">₹${product.productPrice || product.price}</span>
                    </div>
                    <p class="text-gray-600 mb-4">${product.productDesc || product.desc}</p>
                    <div class="flex justify-between items-center">
                        <div class="flex items-center">
                            <div class="w-8 h-8 rounded-full bg-[#8b5cf6] flex items-center justify-center text-white text-xs">${(product.sellerName || product.seller || 'S').charAt(0)}</div>
                            <div class="ml-3">
                                <p class="text-sm font-medium">${product.sellerName || product.seller || 'Seller'}</p>
                                <p class="text-xs text-gray-500">${product.sellerVillage || product.village || ''}</p>
                            </div>
                        </div>
                        <a href="tel:${product.sellerContact || product.contact}" class="bg-[#f59e0b] text-white p-2 rounded-full hover:bg-[#e67e22] transition">
                            <i data-feather="phone"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
    });
    feather.replace();
}

function renderCommunityAnswers() {
    const answers = JSON.parse(localStorage.getItem('mittiAnswers') || '[]');
    const container = document.getElementById('communityAnswers');
    if (!container) return;
    container.innerHTML = '';
    answers.forEach(answer => {
        container.innerHTML += `
            <div class="border-l-4 border-[#8b5cf6] pl-4 py-2">
                <p class="text-gray-700 mb-3">${answer.answerText || answer.text}</p>
                <div class="flex items-center">
                    <div class="w-8 h-8 rounded-full bg-[#8b5cf6] flex items-center justify-center text-white text-xs">${(answer.answerName || answer.name).charAt(0)}</div>
                    <div class="ml-3">
                        <p class="text-sm font-medium">${answer.answerName || answer.name}</p>
                        <p class="text-xs text-gray-500">${answer.answerVillage || answer.village}</p>
                    </div>
                </div>
            </div>
        `;
    });
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initLanguage();
    initActiveNav();
    initModals();
    feather.replace();
    
    // Form handlers (prevent double-inits - see guard inside)
    handleFormSubmit(
        'sellForm', 
        'mittiProducts',
        currentLanguage === 'en' ? 'Product listed successfully!' : 'उत्पाद सफलतापूर्वक सूचीबद्ध किया गया!'
    );
    
    handleFormSubmit(
        'answerForm', 
        'mittiAnswers',
        currentLanguage === 'en' ? 'Answer posted successfully!' : 'जवाब सफलतापूर्वक पोस्ट किया गया!'
    );
    
    handleFormSubmit(
        'storyForm', 
        'mittiStories',
        currentLanguage === 'en' ? 'Story shared successfully!' : 'कहानी सफलतापूर्वक साझा की गई!'
    );

    // Render lists if present on page
    renderBazaarItems();
    renderCommunityAnswers();
    renderRecentStories();
    renderAudioList();
});



function renderAudioList() {
    const container = document.getElementById('audioList');
    if (!container) return;
    const audioItems = JSON.parse(localStorage.getItem('mittiAudio') || '[]');
    container.innerHTML = '';
    if (audioItems.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No recordings yet.</p>';
        return;
    }
    audioItems.forEach(item => {
        const html = `
            <div class="flex items-center justify-between bg-white p-3 rounded-md shadow-sm">
                <div class="flex items-center gap-3">
                    <audio controls src="${item.url}"></audio>
                    <div class="text-xs text-gray-500">${new Date(item.timestamp).toLocaleString()}</div>
                </div>
                <div>
                    <button class="px-2 py-1 text-sm bg-gray-100 rounded copy-audio-btn">Copy URL</button>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
    // attach copy handlers
    container.querySelectorAll('.copy-audio-btn').forEach((btn, idx) => {
        btn.onclick = () => {
            const audioItems = JSON.parse(localStorage.getItem('mittiAudio') || '[]');
            const url = audioItems[idx].url;
            navigator.clipboard.writeText(url).then(()=> showToast(currentLanguage==='en'?'Audio URL copied':'ऑडियो URL कॉपी किया गया'));
        };
    });
}

