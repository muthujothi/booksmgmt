package com.booksmgmt.controller;

import com.booksmgmt.model.Quote;
import com.booksmgmt.service.QuoteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/books/{bookId}/quotes")
public class QuoteController {

    private final QuoteService quoteService;

    public QuoteController(QuoteService quoteService) {
        this.quoteService = quoteService;
    }

    @GetMapping
    public List<Quote> getQuotes(@PathVariable Long bookId) {
        return quoteService.getByBookId(bookId);
    }

    @PostMapping
    public ResponseEntity<Quote> createQuote(@PathVariable Long bookId, @RequestBody Map<String, Object> body) {
        String content = (String) body.get("content");
        Integer pageNumber = body.get("pageNumber") != null ? ((Number) body.get("pageNumber")).intValue() : null;

        Quote quote = quoteService.create(bookId, content, pageNumber);
        return quote != null ? ResponseEntity.ok(quote) : ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Quote> updateQuote(@PathVariable Long bookId, @PathVariable Long id,
                                             @RequestBody Map<String, Object> body) {
        String content = (String) body.get("content");
        Integer pageNumber = body.get("pageNumber") != null ? ((Number) body.get("pageNumber")).intValue() : null;

        Quote quote = quoteService.update(id, content, pageNumber);
        return quote != null ? ResponseEntity.ok(quote) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQuote(@PathVariable Long bookId, @PathVariable Long id) {
        return quoteService.delete(id) ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }
}
