package com.booksmgmt.controller;

import com.booksmgmt.model.Book;
import com.booksmgmt.service.BookService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

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
                                 @RequestParam(required = false) String readStatus) {
        return bookService.searchBooks(search, genre, readStatus);
    }

    @GetMapping("/genres")
    public List<String> getGenres() {
        return bookService.getDistinctGenres();
    }

    @PostMapping("/batch")
    public List<Book> createBooks(@RequestBody List<BookService.BookRequest> requests) {
        return bookService.createBooks(requests);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Book> getBook(@PathVariable Long id) {
        return bookService.findById(id)
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
        return bookService.createBook(title, author, genre, isbn, publisher, year, pages,
                location, readStatus, rating, notes, coverImage, coverImageUrl);
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
