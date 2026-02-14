package com.booksmgmt.controller;

import com.booksmgmt.model.Book;
import com.booksmgmt.repository.BookRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
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
import java.util.Arrays;
import java.util.List;
import java.util.TreeSet;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookRepository bookRepository;
    private final Path uploadDir;

    public BookController(BookRepository bookRepository,
                          @Value("${app.upload.dir:./uploads/covers}") String uploadPath) {
        this.bookRepository = bookRepository;
        this.uploadDir = Paths.get(uploadPath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory", e);
        }
    }

    @GetMapping
    public List<Book> getAllBooks(@RequestParam(required = false) String search,
                                 @RequestParam(required = false) String genre,
                                 @RequestParam(required = false) String readStatus) {
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

    @GetMapping("/genres")
    public List<String> getGenres() {
        return bookRepository.findAll().stream()
                .map(Book::getGenre)
                .filter(g -> g != null && !g.isEmpty())
                .flatMap(g -> Arrays.stream(g.split(",")))
                .map(String::trim)
                .filter(g -> !g.isEmpty())
                .collect(Collectors.toCollection(TreeSet::new))
                .stream().toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Book> getBook(@PathVariable Long id) {
        return bookRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Book createBook(@RequestParam("title") String title,
                           @RequestParam(value = "author", required = false) String author,
                           @RequestParam(value = "genre", required = false) String genre,
                           @RequestParam(value = "isbn", required = false) String isbn,
                           @RequestParam(value = "publisher", required = false) String publisher,
                           @RequestParam(value = "year", required = false) Integer year,
                           @RequestParam(value = "pages", required = false) Integer pages,
                           @RequestParam(value = "location", required = false) String location,
                           @RequestParam(value = "readStatus", defaultValue = "UNREAD") String readStatus,
                           @RequestParam(value = "rating", required = false) Integer rating,
                           @RequestParam(value = "notes", required = false) String notes,
                           @RequestParam(value = "coverImage", required = false) MultipartFile coverImage,
                           @RequestParam(value = "coverImageUrl", required = false) String coverImageUrl) throws IOException {
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

    @PutMapping("/{id}")
    public ResponseEntity<Book> updateBook(@PathVariable Long id,
                                           @RequestParam("title") String title,
                                           @RequestParam(value = "author", required = false) String author,
                                           @RequestParam(value = "genre", required = false) String genre,
                                           @RequestParam(value = "isbn", required = false) String isbn,
                                           @RequestParam(value = "publisher", required = false) String publisher,
                                           @RequestParam(value = "year", required = false) Integer year,
                                           @RequestParam(value = "pages", required = false) Integer pages,
                                           @RequestParam(value = "location", required = false) String location,
                                           @RequestParam(value = "readStatus", defaultValue = "UNREAD") String readStatus,
                                           @RequestParam(value = "rating", required = false) Integer rating,
                                           @RequestParam(value = "notes", required = false) String notes,
                                           @RequestParam(value = "coverImage", required = false) MultipartFile coverImage,
                                           @RequestParam(value = "coverImageUrl", required = false) String coverImageUrl) throws IOException {
        return bookRepository.findById(id).map(book -> {
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
                try {
                    deleteImageFile(book.getCoverImagePath());
                    book.setCoverImagePath(saveImage(coverImage));
                } catch (IOException e) {
                    throw new RuntimeException("Failed to save image", e);
                }
            } else if (coverImageUrl != null && !coverImageUrl.isEmpty() && book.getCoverImagePath() == null) {
                String saved = downloadImage(coverImageUrl);
                if (saved != null) {
                    book.setCoverImagePath(saved);
                }
            }

            return ResponseEntity.ok(bookRepository.save(book));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBook(@PathVariable Long id) {
        return bookRepository.findById(id).map(book -> {
            deleteImageFile(book.getCoverImagePath());
            bookRepository.delete(book);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    private String saveImage(MultipartFile file) throws IOException {
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

    private String downloadImage(String imageUrl) {
        try {
            // Only allow Google Books URLs
            if (!imageUrl.startsWith("https://books.google.com/")) {
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

    private void deleteImageFile(String imagePath) {
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
}
