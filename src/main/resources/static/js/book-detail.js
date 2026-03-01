const match = window.location.pathname.match(/\/book\/(\d+)/);
if (!match) {
    window.location.href = '/';
}
const bookId = match[1];
const API = `/api/books/${bookId}`;
const QUOTES_API = `${API}/quotes`;
const MEMORIES_API = `${API}/memories`;

let deleteCallback = null;

document.addEventListener('DOMContentLoaded', () => {
    loadBook();
    loadQuotes();
    loadMemories();

    // Close modals on backdrop click
    ['quoteModal', 'memoryModal', 'deleteModal'].forEach(id => {
        document.getElementById(id).addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                e.currentTarget.style.display = 'none';
            }
        });
    });
});

async function loadBook() {
    const res = await fetch(API);
    if (!res.ok) {
        window.location.href = '/';
        return;
    }
    const book = await res.json();

    document.title = `${book.title} — My Book Collection`;

    const coverEl = document.getElementById('bookCover');
    if (book.coverImagePath) {
        coverEl.innerHTML = `<img src="${book.coverImagePath}" alt="${escapeHtml(book.title)}">`;
    } else {
        coverEl.innerHTML = `<div class="detail-cover-placeholder">${escapeHtml(book.title.charAt(0).toUpperCase())}</div>`;
    }

    document.getElementById('bookTitle').textContent = book.title;
    document.getElementById('bookAuthor').textContent = book.author || 'Unknown author';
    document.getElementById('bookStars').innerHTML = renderStars(book.rating);

    const metaParts = [];
    if (book.genre) metaParts.push(book.genre);
    if (book.year) metaParts.push(book.year);
    if (book.pages) metaParts.push(`${book.pages} pages`);
    if (book.publisher) metaParts.push(book.publisher);
    if (book.isbn) metaParts.push(`ISBN: ${book.isbn}`);
    if (book.location) metaParts.push(book.location);
    document.getElementById('bookMeta').innerHTML = metaParts.map(p => `<span class="meta-tag">${escapeHtml(String(p))}</span>`).join('');

    const statusEl = document.getElementById('bookStatus');
    if (book.readStatus === 'READ') {
        statusEl.innerHTML = '<span class="badge badge-read">Read</span>';
    } else if (book.readStatus === 'READING') {
        statusEl.innerHTML = '<span class="badge badge-reading">Reading</span>';
    } else {
        statusEl.innerHTML = '<span class="badge badge-unread">Unread</span>';
    }

    const notesEl = document.getElementById('bookNotes');
    if (book.notes) {
        notesEl.textContent = book.notes;
        notesEl.style.display = '';
    } else {
        notesEl.style.display = 'none';
    }
}

async function loadQuotes() {
    const res = await fetch(QUOTES_API);
    const quotes = await res.json();

    const list = document.getElementById('quotesList');
    const empty = document.getElementById('quotesEmpty');

    if (quotes.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    list.innerHTML = quotes.map(q => `
        <div class="quote-card">
            <div class="quote-watermark">&ldquo;</div>
            <div class="quote-content">${escapeHtml(q.content)}</div>
            ${q.pageNumber ? `<div class="quote-page"><span class="page-pill">p. ${q.pageNumber}</span></div>` : ''}
            <div class="card-actions">
                <button class="edit-btn" onclick="editQuote(${q.id}, '${escapeJs(q.content)}', ${q.pageNumber || 'null'})">Edit</button>
                <button class="delete-btn" onclick="deleteQuote(${q.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

async function loadMemories() {
    const res = await fetch(MEMORIES_API);
    const memories = await res.json();

    const list = document.getElementById('memoriesList');
    const empty = document.getElementById('memoriesEmpty');

    if (memories.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    list.innerHTML = memories.map(m => {
        const date = new Date(m.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        return `
            <div class="memory-card">
                <div class="memory-date">${date}</div>
                <div class="memory-content">${escapeHtml(m.content)}</div>
                <div class="card-actions">
                    <button class="edit-btn" onclick="editMemory(${m.id}, '${escapeJs(m.content)}')">Edit</button>
                    <button class="delete-btn" onclick="deleteMemory(${m.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Quote CRUD
function openQuoteModal(quote) {
    document.getElementById('quoteForm').reset();
    document.getElementById('quoteId').value = '';
    document.getElementById('quoteModalTitle').textContent = 'Add Quote';
    document.getElementById('quoteModal').style.display = 'flex';
}

function closeQuoteModal() {
    document.getElementById('quoteModal').style.display = 'none';
}

function editQuote(id, content, pageNumber) {
    document.getElementById('quoteModalTitle').textContent = 'Edit Quote';
    document.getElementById('quoteId').value = id;
    document.getElementById('quoteContent').value = content;
    document.getElementById('quotePageNumber').value = pageNumber || '';
    document.getElementById('quoteModal').style.display = 'flex';
}

async function handleQuoteSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('quoteId').value;
    const content = document.getElementById('quoteContent').value.trim();
    const pageNum = document.getElementById('quotePageNumber').value;
    const body = { content, pageNumber: pageNum ? parseInt(pageNum) : null };

    if (id) {
        await fetch(`${QUOTES_API}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } else {
        await fetch(QUOTES_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    }

    closeQuoteModal();
    loadQuotes();
}

function deleteQuote(id) {
    document.getElementById('deleteTitle').textContent = 'Delete Quote';
    deleteCallback = async () => {
        await fetch(`${QUOTES_API}/${id}`, { method: 'DELETE' });
        loadQuotes();
    };
    document.getElementById('deleteModal').style.display = 'flex';
}

// Memory CRUD
function openMemoryModal() {
    document.getElementById('memoryForm').reset();
    document.getElementById('memoryId').value = '';
    document.getElementById('memoryModalTitle').textContent = 'Add Memory';
    document.getElementById('memoryModal').style.display = 'flex';
}

function closeMemoryModal() {
    document.getElementById('memoryModal').style.display = 'none';
}

function editMemory(id, content) {
    document.getElementById('memoryModalTitle').textContent = 'Edit Memory';
    document.getElementById('memoryId').value = id;
    document.getElementById('memoryContent').value = content;
    document.getElementById('memoryModal').style.display = 'flex';
}

async function handleMemorySubmit(e) {
    e.preventDefault();
    const id = document.getElementById('memoryId').value;
    const content = document.getElementById('memoryContent').value.trim();
    const body = { content };

    if (id) {
        await fetch(`${MEMORIES_API}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } else {
        await fetch(MEMORIES_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    }

    closeMemoryModal();
    loadMemories();
}

function deleteMemory(id) {
    document.getElementById('deleteTitle').textContent = 'Delete Memory';
    deleteCallback = async () => {
        await fetch(`${MEMORIES_API}/${id}`, { method: 'DELETE' });
        loadMemories();
    };
    document.getElementById('deleteModal').style.display = 'flex';
}

// Shared delete confirmation
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    deleteCallback = null;
}

async function confirmDelete() {
    if (deleteCallback) {
        await deleteCallback();
    }
    closeDeleteModal();
}

// Helpers
function renderStars(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += i <= (rating || 0)
            ? '<span>&#9733;</span>'
            : '<span class="empty">&#9733;</span>';
    }
    return html;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeJs(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
}
