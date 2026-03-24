const API = '/api/books';
let deleteBookId = null;
let googleBooksThumbnailUrl = null;
let pendingBooks = [];
let lastFetchedQuery = null;
let assignMode = false;
let selectedIds = new Set();

document.addEventListener('DOMContentLoaded', () => {
    loadBooks();
    loadGenres();
    loadStats();

    document.getElementById('addBookBtn').addEventListener('click', () => openModal());
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('bookForm').addEventListener('submit', handleSubmit);
    document.getElementById('addAnotherBtn').addEventListener('click', saveAndAddAnother);
    document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDelete').addEventListener('click', handleDelete);

    document.getElementById('searchInput').addEventListener('input', debounce(loadBooks, 300));
    document.getElementById('genreFilter').addEventListener('change', loadBooks);
    document.getElementById('readStatusFilter').addEventListener('change', loadBooks);
    document.getElementById('locationFilter').addEventListener('change', loadBooks);
    document.getElementById('assignLocationsBtn').addEventListener('click', enterAssignMode);

    // Star rating
    document.querySelectorAll('#starRating .star').forEach(star => {
        star.addEventListener('click', () => {
            const value = parseInt(star.dataset.value);
            const current = parseInt(document.getElementById('rating').value);
            // Click same star again to clear rating
            if (current === value) {
                document.getElementById('rating').value = '';
                updateStars(0);
            } else {
                document.getElementById('rating').value = value;
                updateStars(value);
            }
        });
    });

    // Image preview
    document.getElementById('coverImage').addEventListener('change', (e) => {
        const file = e.target.files[0];
        const preview = document.getElementById('imagePreview');
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                preview.innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
            document.getElementById('coverOptions').innerHTML = '';
        } else {
            preview.innerHTML = '';
        }
    });

    // Auto-fill from Google Books API when title or author field loses focus
    const triggerAutoFill = () => {
        const title = document.getElementById('title').value.trim();
        const author = document.getElementById('author').value.trim();
        if (title && author) fetchBookDetails(title, author);
    };
    document.getElementById('author').addEventListener('blur', triggerAutoFill);
    document.getElementById('title').addEventListener('blur', triggerAutoFill);

    // Close modal on backdrop click
    document.getElementById('bookModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
    document.getElementById('deleteModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeDeleteModal();
    });
});

async function loadBooks() {
    if (assignMode) return;

    const params = new URLSearchParams();
    const search = document.getElementById('searchInput').value.trim();
    const genre = document.getElementById('genreFilter').value;
    const readStatus = document.getElementById('readStatusFilter').value;
    const noLocation = document.getElementById('locationFilter').value === 'no-location';

    if (search) params.set('search', search);
    if (genre) params.set('genre', genre);
    if (readStatus) params.set('readStatus', readStatus);
    if (noLocation) params.set('noLocation', 'true');

    const url = params.toString() ? `${API}?${params}` : API;
    const res = await fetch(url);
    const books = await res.json();

    const grid = document.getElementById('booksGrid');
    const empty = document.getElementById('emptyState');

    if (books.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    grid.innerHTML = books.map(book => renderCard(book)).join('');
}

function renderCard(book) {
    const coverHtml = book.coverImagePath
        ? `<img class="book-cover" src="${book.coverImagePath}" alt="${escapeHtml(book.title)}">`
        : `<div class="book-cover-placeholder">${escapeHtml(book.title.charAt(0).toUpperCase())}</div>`;

    const starsHtml = renderStars(book.rating);
    const notesHtml = book.notes
        ? `<div class="notes-excerpt">${escapeHtml(book.notes)}</div>`
        : '';
    let statusBadge;
    if (book.readStatus === 'READ') {
        statusBadge = '<span class="badge badge-read">Read</span>';
    } else if (book.readStatus === 'READING') {
        statusBadge = '<span class="badge badge-reading">Reading</span>';
    } else {
        statusBadge = '<span class="badge badge-unread">Unread</span>';
    }

    const metaParts = [];
    if (book.genre) metaParts.push(escapeHtml(book.genre));
    if (book.year) metaParts.push(book.year);
    if (book.location) metaParts.push(escapeHtml(book.location));

    const isSelected = assignMode && selectedIds.has(book.id);
    const cardClass = `book-card${isSelected ? ' selected' : ''}`;
    const cardOnclick = assignMode
        ? `toggleBookSelection(${book.id})`
        : `navigateToBook(${book.id}, event)`;
    const checkboxHtml = assignMode
        ? `<div class="card-checkbox">${isSelected ? '✓' : ''}</div>`
        : '';
    const actionsHtml = assignMode ? '' : `
                <div class="book-actions">
                    <button class="edit-btn" onclick="editBook(${book.id})">Edit</button>
                    <button class="delete-btn" onclick="confirmDeleteBook(${book.id})">Delete</button>
                </div>`;

    return `
        <div class="${cardClass}" onclick="${cardOnclick}">
            ${checkboxHtml}
            ${coverHtml}
            <div class="book-info">
                <h3>${escapeHtml(book.title)}</h3>
                <div class="author">${book.author ? escapeHtml(book.author) : 'Unknown author'}</div>
                <div class="stars">${starsHtml}</div>
                ${metaParts.length ? `<div class="meta">${metaParts.join(' &bull; ')}</div>` : ''}
                ${statusBadge}
                ${notesHtml}
                ${actionsHtml}
            </div>
        </div>
    `;
}

function renderStars(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += i <= (rating || 0)
            ? '<span>&#9733;</span>'
            : '<span class="empty">&#9733;</span>';
    }
    return html;
}

function updateStars(value) {
    document.querySelectorAll('#starRating .star').forEach(star => {
        star.classList.toggle('active', parseInt(star.dataset.value) <= value);
    });
}

function showFormError(msg) {
    const el = document.getElementById('formError');
    el.textContent = msg;
    el.style.display = '';
}

function clearFormError() {
    const el = document.getElementById('formError');
    el.textContent = '';
    el.style.display = 'none';
}

function openModal(book) {
    const modal = document.getElementById('bookModal');
    const form = document.getElementById('bookForm');
    form.reset();
    clearFormError();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('coverOptions').innerHTML = '';
    document.getElementById('rating').value = '';
    googleBooksThumbnailUrl = null;
    lastFetchedQuery = null;
    updateStars(0);

    if (book) {
        document.getElementById('modalTitle').textContent = 'Edit Book';
        document.getElementById('bookId').value = book.id;
        document.getElementById('title').value = book.title || '';
        document.getElementById('author').value = book.author || '';
        document.getElementById('genre').value = book.genre || '';
        document.getElementById('isbn').value = book.isbn || '';
        document.getElementById('publisher').value = book.publisher || '';
        document.getElementById('year').value = book.year || '';
        document.getElementById('pages').value = book.pages || '';
        document.getElementById('location').value = book.location || '';
        document.getElementById('readStatus').value = book.readStatus || 'UNREAD';
        document.getElementById('rating').value = book.rating || '';
        document.getElementById('notes').value = book.notes || '';
        updateStars(book.rating || 0);

        if (book.coverImagePath) {
            document.getElementById('imagePreview').innerHTML =
                `<img src="${book.coverImagePath}" alt="Current cover">`;
        }

        document.getElementById('addAnotherBtn').style.display = 'none';
        document.getElementById('saveBtn').textContent = 'Save';
    } else {
        document.getElementById('modalTitle').textContent = 'Add Book';
        document.getElementById('bookId').value = '';
        pendingBooks = [];
        updateQueuedCount();
        document.getElementById('addAnotherBtn').style.display = '';
        document.getElementById('saveBtn').textContent = 'Submit All';
    }

    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('bookModal').style.display = 'none';
}

async function editBook(id) {
    const res = await fetch(`${API}/${id}`);
    if (res.ok) {
        const book = await res.json();
        openModal(book);
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('bookId').value;

    if (id) {
        // Edit mode — single PUT with FormData (unchanged)
        const formData = new FormData();
        formData.append('title', document.getElementById('title').value);
        formData.append('author', document.getElementById('author').value);
        formData.append('genre', document.getElementById('genre').value);
        formData.append('isbn', document.getElementById('isbn').value);
        formData.append('publisher', document.getElementById('publisher').value);

        const year = document.getElementById('year').value;
        if (year) formData.append('year', year);

        const pages = document.getElementById('pages').value;
        if (pages) formData.append('pages', pages);

        formData.append('location', document.getElementById('location').value);
        formData.append('readStatus', document.getElementById('readStatus').value);

        const rating = document.getElementById('rating').value;
        if (rating) formData.append('rating', rating);

        formData.append('notes', document.getElementById('notes').value);

        const coverFile = document.getElementById('coverImage').files[0];
        if (coverFile) {
            formData.append('coverImage', coverFile);
        } else if (googleBooksThumbnailUrl) {
            formData.append('coverImageUrl', googleBooksThumbnailUrl);
        }

        const res = await fetch(`${API}/${id}`, { method: 'PUT', body: formData });
        if (res.ok) {
            closeModal();
            loadBooks();
            loadGenres();
            loadStats();
        }
    } else {
        // Add mode — batch JSON submit
        const currentBook = captureBookFromForm();
        if (!currentBook.title) return;

        const allBooks = [...pendingBooks, currentBook];
        const res = await fetch(`${API}/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(allBooks)
        });
        if (res.ok) {
            pendingBooks = [];
            closeModal();
            loadBooks();
            loadGenres();
            loadStats();
        } else {
            const data = await res.json();
            showFormError(data.error || 'Failed to save books.');
        }
    }
}

function captureBookFromForm() {
    const obj = {
        title: document.getElementById('title').value.trim(),
        author: document.getElementById('author').value.trim(),
        genre: document.getElementById('genre').value.trim(),
        isbn: document.getElementById('isbn').value.trim(),
        publisher: document.getElementById('publisher').value.trim(),
        location: document.getElementById('location').value.trim(),
        readStatus: document.getElementById('readStatus').value,
        notes: document.getElementById('notes').value.trim(),
        coverImageUrl: googleBooksThumbnailUrl || null
    };

    const year = document.getElementById('year').value;
    if (year) obj.year = parseInt(year);

    const pages = document.getElementById('pages').value;
    if (pages) obj.pages = parseInt(pages);

    const rating = document.getElementById('rating').value;
    if (rating) obj.rating = parseInt(rating);

    return obj;
}

async function saveAndAddAnother() {
    const title = document.getElementById('title').value.trim();
    if (!title) {
        document.getElementById('title').focus();
        return;
    }

    // Check against pending queue (case-insensitive)
    const titleLower = title.toLowerCase();
    if (pendingBooks.some(b => b.title.toLowerCase() === titleLower)) {
        showFormError(`"${title}" is already in the queue.`);
        return;
    }

    // Check against database
    const res = await fetch(`${API}?search=${encodeURIComponent(title)}`);
    if (res.ok) {
        const books = await res.json();
        if (books.some(b => b.title.toLowerCase() === titleLower)) {
            showFormError(`A book with this title already exists.`);
            return;
        }
    }

    clearFormError();
    const book = captureBookFromForm();
    pendingBooks.push(book);
    updateQueuedCount();

    // Reset form for next book
    document.getElementById('bookForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('coverOptions').innerHTML = '';
    document.getElementById('rating').value = '';
    googleBooksThumbnailUrl = null;
    lastFetchedQuery = null;
    updateStars(0);
    document.getElementById('title').focus();
}

function updateQueuedCount() {
    const badge = document.getElementById('queuedCount');
    if (pendingBooks.length > 0) {
        badge.textContent = pendingBooks.length === 1
            ? '1 book queued'
            : `${pendingBooks.length} books queued`;
        badge.style.display = '';
    } else {
        badge.style.display = 'none';
    }
}

function confirmDeleteBook(id) {
    deleteBookId = id;
    document.getElementById('deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    deleteBookId = null;
}

async function handleDelete() {
    if (deleteBookId) {
        await fetch(`${API}/${deleteBookId}`, { method: 'DELETE' });
        closeDeleteModal();
        loadBooks();
        loadGenres();
        loadStats();
    }
}

async function loadGenres() {
    const res = await fetch(`${API}/genres`);
    const genres = await res.json();
    const select = document.getElementById('genreFilter');
    const current = select.value;
    select.innerHTML = '<option value="">All Genres</option>';
    genres.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        select.appendChild(opt);
    });
    select.value = current;
}

const GENRE_PALETTE = [
    { bg: '#dff5e3', text: '#1e7e34' },
    { bg: '#dbeafe', text: '#1d4ed8' },
    { bg: '#fde8d8', text: '#c05621' },
    { bg: '#f3e8ff', text: '#6d28d9' },
    { bg: '#fef9c3', text: '#92400e' },
    { bg: '#fce7f3', text: '#9d174d' },
    { bg: '#e0f2fe', text: '#075985' },
    { bg: '#dcfce7', text: '#166534' },
    { bg: '#fff1f2', text: '#9f1239' },
    { bg: '#f0fdf4', text: '#15803d' },
    { bg: '#ede9fe', text: '#5b21b6' },
    { bg: '#ffedd5', text: '#9a3412' },
];

const AUTHOR_PALETTE = [
    { bg: '#e2e8f0', text: '#1e293b' },
    { bg: '#fee2e2', text: '#991b1b' },
    { bg: '#d1fae5', text: '#065f46' },
    { bg: '#e0e7ff', text: '#3730a3' },
    { bg: '#fef3c7', text: '#78350f' },
    { bg: '#fce7f3', text: '#831843' },
    { bg: '#cffafe', text: '#155e75' },
    { bg: '#f1f5f9', text: '#334155' },
];

function chipColor(name, palette) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
}

function renderChips(entries, palette, onclick, container, limit) {
    const visible = entries.slice(0, limit);
    const hidden  = entries.slice(limit);

    const chips = visible.map(([name, count]) => {
        const c = chipColor(name, palette);
        return `<span class="stats-chip" style="background:${c.bg};color:${c.text};" onclick="${onclick}('${escapeHtml(name)}')">${escapeHtml(name)}<span class="chip-count" style="background:${c.text};color:${c.bg};">${count}</span></span>`;
    }).join('');

    const toggle = hidden.length > 0
        ? `<span class="stats-show-toggle" onclick="toggleChips(this)" data-expanded="false">+${hidden.length} more ▾</span>`
        : '';

    const hiddenChips = hidden.map(([name, count]) => {
        const c = chipColor(name, palette);
        return `<span class="stats-chip" style="background:${c.bg};color:${c.text};display:none;" onclick="${onclick}('${escapeHtml(name)}')">${escapeHtml(name)}<span class="chip-count" style="background:${c.text};color:${c.bg};">${count}</span></span>`;
    }).join('');

    container.innerHTML = chips + hiddenChips + toggle;
}

function toggleChips(toggleEl) {
    const expanded = toggleEl.dataset.expanded === 'true';
    const hidden = toggleEl.parentElement.querySelectorAll('.stats-chip[style*="display:none"]');
    const allHidden = toggleEl.parentElement.querySelectorAll('.stats-chip[style*="display:none"], .stats-chip[style*="display: none"]');

    if (!expanded) {
        toggleEl.parentElement.querySelectorAll('.stats-chip').forEach(chip => {
            chip.style.display = '';
        });
        toggleEl.dataset.expanded = 'true';
        const total = toggleEl.parentElement.querySelectorAll('.stats-chip').length;
        toggleEl.textContent = 'Show less ▴';
    } else {
        let count = 0;
        toggleEl.parentElement.querySelectorAll('.stats-chip').forEach((chip, i) => {
            if (i >= 8) { chip.style.display = 'none'; count++; }
        });
        toggleEl.dataset.expanded = 'false';
        toggleEl.textContent = `+${count} more ▾`;
    }
}

async function loadStats() {
    const res = await fetch(`${API}/stats`);
    if (!res.ok) return;
    const stats = await res.json();

    document.getElementById('statTotal').textContent   = stats.total;
    document.getElementById('statRead').textContent    = stats.read;
    document.getElementById('statReading').textContent = stats.reading;
    document.getElementById('statUnread').textContent  = stats.unread;

    const genreRow    = document.getElementById('genreStatsRow');
    const genreEntries = Object.entries(stats.byGenre || {});
    if (genreEntries.length > 0) {
        renderChips(genreEntries, GENRE_PALETTE, 'filterByGenre',
            document.getElementById('genreChips'), 8);
        genreRow.style.display = '';
    } else {
        genreRow.style.display = 'none';
    }

    const authorRow    = document.getElementById('authorStatsRow');
    const authorEntries = Object.entries(stats.topAuthors || {});
    if (authorEntries.length > 0) {
        renderChips(authorEntries, AUTHOR_PALETTE, 'filterByAuthor',
            document.getElementById('authorChips'), 8);
        authorRow.style.display = '';
    } else {
        authorRow.style.display = 'none';
    }

    document.getElementById('statsSection').style.display = stats.total > 0 ? '' : 'none';
}

async function enterAssignMode() {
    const res = await fetch(`${API}/missing-location`);
    if (!res.ok) return;
    const books = await res.json();

    assignMode = true;
    selectedIds = new Set();

    const grid = document.getElementById('booksGrid');
    const empty = document.getElementById('emptyState');
    const banner = document.getElementById('assignBanner');
    const subtext = document.getElementById('assignBannerSubtext');

    if (books.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        empty.querySelector('p').textContent = 'All books have a location assigned. Nothing to do here!';
    } else {
        empty.style.display = 'none';
        grid.innerHTML = books.map(book => renderCard(book)).join('');
        subtext.textContent = `${books.length} book${books.length !== 1 ? 's' : ''} without a location — newest first. Click to select.`;
    }

    banner.style.display = '';
    document.getElementById('floatingBar').style.display = '';
    document.getElementById('statsSection').style.display = 'none';
    updateFloatingBar();
}

function exitAssignMode() {
    assignMode = false;
    selectedIds = new Set();
    document.getElementById('assignBanner').style.display = 'none';
    document.getElementById('floatingBar').style.display = 'none';
    document.getElementById('locationInput').value = '';
    document.getElementById('selectAllCheckbox').checked = false;
    document.getElementById('emptyState').querySelector('p').textContent =
        'No books found. Add your first book to get started!';
    loadBooks();
    loadStats();
}

function toggleBookSelection(id) {
    if (selectedIds.has(id)) {
        selectedIds.delete(id);
    } else {
        selectedIds.add(id);
    }
    // Re-render just the affected card
    const cards = document.querySelectorAll('#booksGrid .book-card');
    cards.forEach(card => {
        const onclick = card.getAttribute('onclick');
        if (onclick && onclick.includes(`(${id})`)) {
            const isSelected = selectedIds.has(id);
            card.classList.toggle('selected', isSelected);
            const cb = card.querySelector('.card-checkbox');
            if (cb) cb.textContent = isSelected ? '✓' : '';
        }
    });
    updateFloatingBar();
}

function toggleSelectAll(checked) {
    const cards = document.querySelectorAll('#booksGrid .book-card');
    cards.forEach(card => {
        const onclick = card.getAttribute('onclick') || '';
        const match = onclick.match(/toggleBookSelection\((\d+)\)/);
        if (match) {
            const id = parseInt(match[1]);
            if (checked) {
                selectedIds.add(id);
            } else {
                selectedIds.delete(id);
            }
            card.classList.toggle('selected', checked);
            const cb = card.querySelector('.card-checkbox');
            if (cb) cb.textContent = checked ? '✓' : '';
        }
    });
    updateFloatingBar();
}

function updateFloatingBar() {
    const count = selectedIds.size;
    document.getElementById('selectedCount').textContent =
        count === 0 ? 'No books selected' : `${count} book${count !== 1 ? 's' : ''} selected`;
}

async function saveLocations() {
    const location = document.getElementById('locationInput').value.trim();
    if (!location) {
        document.getElementById('locationInput').focus();
        return;
    }
    if (selectedIds.size === 0) return;

    const res = await fetch(`${API}/bulk-location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selectedIds], location })
    });

    if (res.ok) {
        const data = await res.json();
        // Remove saved cards from the grid
        selectedIds.forEach(id => {
            document.querySelectorAll('#booksGrid .book-card').forEach(card => {
                const onclick = card.getAttribute('onclick') || '';
                if (onclick.includes(`(${id})`)) card.remove();
            });
        });
        selectedIds = new Set();
        document.getElementById('locationInput').value = '';
        document.getElementById('selectAllCheckbox').checked = false;
        updateFloatingBar();

        const remaining = document.querySelectorAll('#booksGrid .book-card').length;
        if (remaining === 0) {
            document.getElementById('emptyState').style.display = 'block';
            document.getElementById('emptyState').querySelector('p').textContent =
                'All done! Every book now has a location.';
        }
        document.getElementById('assignBanner').querySelector('.assign-banner-text span').textContent =
            remaining > 0
                ? `${remaining} book${remaining !== 1 ? 's' : ''} still without a location.`
                : '';
    }
}

function filterByGenre(genre) {
    document.getElementById('genreFilter').value = genre;
    loadBooks();
}

function filterByAuthor(author) {
    document.getElementById('searchInput').value = author;
    loadBooks();
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function fetchFromGoogleBooks(title, author) {
    try {
        const query = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
        const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=3`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.items || data.items.length === 0) return null;

        const info = data.items[0].volumeInfo;

        let isbn = '';
        if (info.industryIdentifiers) {
            const isbn13 = info.industryIdentifiers.find(id => id.type === 'ISBN_13');
            const isbn10 = info.industryIdentifiers.find(id => id.type === 'ISBN_10');
            isbn = (isbn13 || isbn10 || {}).identifier || '';
        }

        const covers = data.items
            .filter(item => item.volumeInfo?.imageLinks?.thumbnail)
            .map(item => item.volumeInfo.imageLinks.thumbnail.replace('http://', 'https://'))
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .slice(0, 3);

        return {
            genre: info.categories ? info.categories.join(', ') : '',
            publisher: info.publisher || '',
            year: info.publishedDate ? info.publishedDate.substring(0, 4) : '',
            pages: info.pageCount || '',
            isbn,
            covers
        };
    } catch (e) {
        return null;
    }
}

async function fetchFromOpenLibrary(title, author) {
    try {
        const params = new URLSearchParams({
            title,
            author,
            limit: '3',
            fields: 'title,author_name,publisher,first_publish_year,number_of_pages_median,subject,isbn,cover_i'
        });
        const url = `https://openlibrary.org/search.json?${params}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.docs || data.docs.length === 0) return null;

        const doc = data.docs[0];

        const subjects = doc.subject || [];
        const genre = subjects.slice(0, 3).join(', ');

        const publisher = (doc.publisher && doc.publisher[0]) || '';
        const year = doc.first_publish_year || '';
        const pages = doc.number_of_pages_median || '';

        let isbn = '';
        if (doc.isbn && doc.isbn.length > 0) {
            isbn = doc.isbn.find(i => i.length === 13) || doc.isbn.find(i => i.length === 10) || doc.isbn[0] || '';
        }

        const covers = data.docs
            .filter(d => d.cover_i)
            .map(d => `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`)
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .slice(0, 3);

        return { genre, publisher, year, pages, isbn, covers };
    } catch (e) {
        return null;
    }
}

async function fetchBookDetails(title, author) {
    if (lastFetchedQuery && lastFetchedQuery.title === title && lastFetchedQuery.author === author) {
        return;
    }

    let result = await fetchFromGoogleBooks(title, author);
    if (!result) result = await fetchFromOpenLibrary(title, author);

    const coverInput = document.getElementById('coverImage');
    const preview = document.getElementById('imagePreview');
    const optionsContainer = document.getElementById('coverOptions');

    if (!result) {
        document.getElementById('genre').value = '';
        document.getElementById('publisher').value = '';
        document.getElementById('year').value = '';
        document.getElementById('pages').value = '';
        document.getElementById('isbn').value = '';
        optionsContainer.innerHTML = '';
        if (!coverInput.files.length) {
            preview.innerHTML = '';
            googleBooksThumbnailUrl = null;
        }
        lastFetchedQuery = { title, author };
        return;
    }

    document.getElementById('genre').value = result.genre;
    document.getElementById('publisher').value = result.publisher;
    document.getElementById('year').value = result.year;
    document.getElementById('pages').value = result.pages;
    document.getElementById('isbn').value = result.isbn;

    if (!coverInput.files.length) {
        if (result.covers.length > 0) {
            optionsContainer.innerHTML = result.covers.map((coverUrl, i) =>
                `<div class="cover-option${i === 0 ? ' selected' : ''}" data-url="${coverUrl}">
                    <img src="${coverUrl}" alt="Cover option ${i + 1}">
                </div>`
            ).join('');

            googleBooksThumbnailUrl = result.covers[0];
            preview.innerHTML = `<img src="${result.covers[0]}" alt="Cover preview">`;

            optionsContainer.querySelectorAll('.cover-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    optionsContainer.querySelectorAll('.cover-option').forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    googleBooksThumbnailUrl = opt.dataset.url;
                    preview.innerHTML = `<img src="${opt.dataset.url}" alt="Cover preview">`;
                });
            });
        } else {
            optionsContainer.innerHTML = '';
            preview.innerHTML = '';
            googleBooksThumbnailUrl = null;
        }
    }

    lastFetchedQuery = { title, author };
}

function navigateToBook(id, event) {
    if (event.target.closest('.book-actions')) return;
    window.location.href = `/book/${id}`;
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}
