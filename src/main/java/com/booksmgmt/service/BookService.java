package com.booksmgmt.service;

import com.booksmgmt.model.Book;
import com.booksmgmt.repository.BookRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.TreeSet;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BookService {

    private static final List<String> ALLOWED_COVER_PREFIXES = List.of(
            "https://books.google.com/",
            "https://covers.openlibrary.org/"
    );

    private final BookRepository bookRepository;
    private final Path uploadDir;

    public BookService(BookRepository bookRepository,
                       @Value("${app.upload.dir:./uploads/covers}") String uploadPath) {
        this.bookRepository = bookRepository;
        this.uploadDir = Paths.get(uploadPath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory", e);
        }
    }

    public Optional<Book> findById(Long id) {
        return bookRepository.findById(id);
    }

    public List<Book> searchBooks(String search, String genre, String readStatus) {
        List<Book> books = bookRepository.findAllSortedByRating();

        return books.stream()
                .filter(b -> search == null || search.isEmpty()
                        || (b.getTitle() != null && b.getTitle().toLowerCase().contains(search.toLowerCase()))
                        || (b.getAuthor() != null && b.getAuthor().toLowerCase().contains(search.toLowerCase())))
                .filter(b -> {
                    if (genre == null || genre.isEmpty()) return true;
                    if (b.getGenre() == null) return false;
                    return Arrays.stream(b.getGenre().split(","))
                            .map(String::trim)
                            .anyMatch(g -> g.equalsIgnoreCase(genre));
                })
                .filter(b -> readStatus == null || readStatus.isEmpty() || readStatus.equals(b.getReadStatus()))
                .collect(Collectors.toList());
    }

    public List<String> getDistinctGenres() {
        return bookRepository.findAll().stream()
                .map(Book::getGenre)
                .filter(g -> g != null && !g.isEmpty())
                .flatMap(g -> Arrays.stream(g.split(",")))
                .map(String::trim)
                .filter(g -> !g.isEmpty())
                .collect(Collectors.toCollection(TreeSet::new))
                .stream().toList();
    }

    public Book createBook(String title, String author, String genre, String isbn,
                           String publisher, Integer year, Integer pages, String location,
                           String readStatus, Integer rating, String notes,
                           MultipartFile coverImage, String coverImageUrl) throws IOException {
        Book book = new Book();
        book.setTitle(title);
        book.setAuthor(author);
        book.setGenre(genre);
        book.setIsbn(isbn);
        book.setPublisher(publisher);
        book.setYear(year);
        book.setPages(pages);
        book.setLocation(location);
        book.setReadStatus(readStatus);
        book.setRating(rating);
        book.setNotes(notes);

        if (coverImage != null && !coverImage.isEmpty()) {
            book.setCoverImagePath(saveImage(coverImage));
        } else if (coverImageUrl != null && !coverImageUrl.isEmpty()) {
            String saved = downloadImage(coverImageUrl);
            if (saved != null) book.setCoverImagePath(saved);
        }

        return bookRepository.save(book);
    }

    @Transactional
    public List<Book> createBooks(List<BookRequest> requests) {
        List<Book> saved = new ArrayList<>();
        for (BookRequest req : requests) {
            Book book = new Book();
            book.setTitle(req.title);
            book.setAuthor(req.author);
            book.setGenre(req.genre);
            book.setIsbn(req.isbn);
            book.setPublisher(req.publisher);
            book.setYear(req.year);
            book.setPages(req.pages);
            book.setLocation(req.location);
            book.setReadStatus(req.readStatus != null ? req.readStatus : "UNREAD");
            book.setRating(req.rating);
            book.setNotes(req.notes);

            if (req.coverImageUrl != null && !req.coverImageUrl.isEmpty()) {
                String path = downloadImage(req.coverImageUrl);
                if (path != null) book.setCoverImagePath(path);
            }

            saved.add(bookRepository.save(book));
        }
        return saved;
    }

    public Book updateBook(Long id, String title, String author, String genre, String isbn,
                           String publisher, Integer year, Integer pages, String location,
                           String readStatus, Integer rating, String notes,
                           MultipartFile coverImage, String coverImageUrl) throws IOException {
        Book book = bookRepository.findById(id).orElse(null);
        if (book == null) return null;

        book.setTitle(title);
        book.setAuthor(author);
        book.setGenre(genre);
        book.setIsbn(isbn);
        book.setPublisher(publisher);
        book.setYear(year);
        book.setPages(pages);
        book.setLocation(location);
        book.setReadStatus(readStatus);
        book.setRating(rating);
        book.setNotes(notes);

        if (coverImage != null && !coverImage.isEmpty()) {
            deleteImageFile(book.getCoverImagePath());
            book.setCoverImagePath(saveImage(coverImage));
        } else if (coverImageUrl != null && !coverImageUrl.isEmpty() && book.getCoverImagePath() == null) {
            String saved = downloadImage(coverImageUrl);
            if (saved != null) {
                book.setCoverImagePath(saved);
            }
        }

        return bookRepository.save(book);
    }

    public boolean deleteBook(Long id) {
        return bookRepository.findById(id).map(book -> {
            deleteImageFile(book.getCoverImagePath());
            bookRepository.delete(book);
            return true;
        }).orElse(false);
    }

    public String saveImage(MultipartFile file) throws IOException {
        String originalName = file.getOriginalFilename();
        String extension = "";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf("."));
        }

        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png"))) {
            throw new IllegalArgumentException("Only JPEG and PNG images are accepted");
        }

        String filename = UUID.randomUUID() + extension;
        Path targetPath = uploadDir.resolve(filename).normalize();
        if (!targetPath.startsWith(uploadDir)) {
            throw new IllegalArgumentException("Invalid file path");
        }
        Files.copy(file.getInputStream(), targetPath);
        return "/uploads/covers/" + filename;
    }

    public String downloadImage(String imageUrl) {
        try {
            if (ALLOWED_COVER_PREFIXES.stream().noneMatch(imageUrl::startsWith)) {
                return null;
            }
            HttpClient client = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NORMAL).build();
            HttpRequest request = HttpRequest.newBuilder().uri(URI.create(imageUrl)).build();
            HttpResponse<InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() != 200) return null;

            String contentType = response.headers().firstValue("content-type").orElse("");
            String extension;
            if (contentType.contains("png")) {
                extension = ".png";
            } else {
                extension = ".jpg";
            }

            String filename = UUID.randomUUID() + extension;
            Path targetPath = uploadDir.resolve(filename).normalize();
            if (!targetPath.startsWith(uploadDir)) return null;

            Files.copy(response.body(), targetPath);
            return "/uploads/covers/" + filename;
        } catch (Exception e) {
            return null;
        }
    }

    public void deleteImageFile(String imagePath) {
        if (imagePath != null) {
            try {
                String filename = imagePath.substring(imagePath.lastIndexOf("/") + 1);
                Path filePath = uploadDir.resolve(filename).normalize();
                if (filePath.startsWith(uploadDir)) {
                    Files.deleteIfExists(filePath);
                }
            } catch (IOException ignored) {
            }
        }
    }

    public static class BookRequest {
        public String title;
        public String author;
        public String genre;
        public String isbn;
        public String publisher;
        public Integer year;
        public Integer pages;
        public String location;
        public String readStatus;
        public Integer rating;
        public String notes;
        public String coverImageUrl;
    }
}
