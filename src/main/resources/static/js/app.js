const API = '/api/books';
let deleteBookId = null;
let googleBooksThumbnailUrl = null;

document.addEventListener('DOMContentLoaded', () => {
    loadBooks();
    loadGenres();

    document.getElementById('addBookBtn').addEventListener('click', () => openModal());
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('bookForm').addEventListener('submit', handleSubmit);
    document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDelete').addEventListener('click', handleDelete);

    document.getElementById('searchInput').addEventListener('input', debounce(loadBooks, 300));
    document.getElementById('genreFilter').addEventListener('change', loadBooks);
    document.getElementById('readStatusFilter').addEventListener('change', loadBooks);

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
        } else {
            preview.innerHTML = '';
        }
    });

    // Auto-fill from Google Books API when author field loses focus
    document.getElementById('author').addEventListener('blur', () => {
        const title = document.getElementById('title').value.trim();
        const author = document.getElementById('author').value.trim();
        if (title && author) fetchBookDetails(title, author);
    });

    // Close modal on backdrop click
    document.getElementById('bookModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
    document.getElementById('deleteModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeDeleteModal();
    });
});

async function loadBooks() {
    const params = new URLSearchParams();
    const search = document.getElementById('searchInput').value.trim();
    const genre = document.getElementById('genreFilter').value;
    const readStatus = document.getElementById('readStatusFilter').value;

    if (search) params.set('search', search);
    if (genre) params.set('genre', genre);
    if (readStatus) params.set('readStatus', readStatus);

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

    return `
        <div class="book-card">
            ${coverHtml}
            <div class="book-info">
                <h3>${escapeHtml(book.title)}</h3>
                <div class="author">${book.author ? escapeHtml(book.author) : 'Unknown author'}</div>
                <div class="stars">${starsHtml}</div>
                ${metaParts.length ? `<div class="meta">${metaParts.join(' &bull; ')}</div>` : ''}
                ${statusBadge}
                ${notesHtml}
                <div class="book-actions">
                    <button class="edit-btn" onclick="editBook(${book.id})">Edit</button>
                    <button class="delete-btn" onclick="confirmDeleteBook(${book.id})">Delete</button>
                </div>
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

function openModal(book) {
    const modal = document.getElementById('bookModal');
    const form = document.getElementById('bookForm');
    form.reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('rating').value = '';
    googleBooksThumbnailUrl = null;
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
    } else {
        document.getElementById('modalTitle').textContent = 'Add Book';
        document.getElementById('bookId').value = '';
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

    const url = id ? `${API}/${id}` : API;
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, { method, body: formData });
    if (res.ok) {
        closeModal();
        loadBooks();
        loadGenres();
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

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function fetchBookDetails(title, author) {
    const query = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;

    try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.items || data.items.length === 0) return;

        const info = data.items[0].volumeInfo;

        const setIfEmpty = (id, value) => {
            const el = document.getElementById(id);
            if (el && !el.value && value) el.value = value;
        };

        setIfEmpty('genre', info.categories ? info.categories.join(', ') : '');
        setIfEmpty('publisher', info.publisher);
        setIfEmpty('year', info.publishedDate ? info.publishedDate.substring(0, 4) : '');
        setIfEmpty('pages', info.pageCount);

        if (info.industryIdentifiers) {
            const isbn13 = info.industryIdentifiers.find(id => id.type === 'ISBN_13');
            const isbn10 = info.industryIdentifiers.find(id => id.type === 'ISBN_10');
            setIfEmpty('isbn', (isbn13 || isbn10 || {}).identifier);
        }

        // Show cover thumbnail if no image is already previewed and no file selected
        const preview = document.getElementById('imagePreview');
        const coverInput = document.getElementById('coverImage');
        const thumbnail = info.imageLinks && info.imageLinks.thumbnail;
        if (thumbnail && !preview.querySelector('img') && !coverInput.files.length) {
            const httpsUrl = thumbnail.replace('http://', 'https://');
            preview.innerHTML = `<img src="${httpsUrl}" alt="Cover preview">`;
            googleBooksThumbnailUrl = httpsUrl;
        }
    } catch (e) {
        // Silently ignore fetch errors — user can still fill fields manually
    }
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}
