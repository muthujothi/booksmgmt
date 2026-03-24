package com.booksmgmt.controller;

import com.booksmgmt.model.Book;
import com.booksmgmt.service.BookService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookService bookService;

    public BookController(BookService bookService) {
        this.bookService = bookService;
    }

    @GetMapping
    public List<Book> getAllBooks(@RequestParam(required = false) String search,
                                 @RequestParam(required = false) String genre,
                                 @RequestParam(required = false) String readStatus,
                                 @RequestParam(required = false, defaultValue = "false") boolean noLocation) {
        return bookService.searchBooks(search, genre, readStatus, noLocation);
    }

    @GetMapping("/missing-location")
    public List<Book> getMissingLocationBooks() {
        return bookService.getMissingLocationBooks();
    }

    @PatchMapping("/bulk-location")
    public ResponseEntity<?> bulkUpdateLocation(@RequestBody BulkLocationRequest req) {
        if (req.location == null || req.location.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Location is required."));
        }
        int updated = bookService.bulkUpdateLocation(req.ids, req.location);
        return ResponseEntity.ok(Map.of("updated", updated));
    }

    public static class BulkLocationRequest {
        public List<Long> ids;
        public String location;
    }

    @GetMapping("/genres")
    public List<String> getGenres() {
        return bookService.getDistinctGenres();
    }

    @GetMapping("/stats")
    public BookService.LibraryStats getStats() {
        return bookService.getStats();
    }

    @PostMapping("/batch")
    public ResponseEntity<?> createBooks(@RequestBody List<BookService.BookRequest> requests) {
        try {
            return ResponseEntity.ok(bookService.createBooks(requests));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Book> getBook(@PathVariable Long id) {
        return bookService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createBook(@RequestParam("title") String title,
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
        try {
            return ResponseEntity.ok(bookService.createBook(title, author, genre, isbn, publisher, year, pages,
                    location, readStatus, rating, notes, coverImage, coverImageUrl));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        }
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
        Book updated = bookService.updateBook(id, title, author, genre, isbn, publisher, year, pages,
                location, readStatus, rating, notes, coverImage, coverImageUrl);
        return updated != null ? ResponseEntity.ok(updated) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBook(@PathVariable Long id) {
        return bookService.deleteBook(id)
                ? ResponseEntity.ok().build()
                : ResponseEntity.notFound().build();
    }
}
