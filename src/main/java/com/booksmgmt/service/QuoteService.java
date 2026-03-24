package com.booksmgmt.service;

import com.booksmgmt.model.Book;
import com.booksmgmt.model.Quote;
import com.booksmgmt.repository.BookRepository;
import com.booksmgmt.repository.QuoteRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class QuoteService {

    private final QuoteRepository quoteRepository;
    private final BookRepository bookRepository;

    public QuoteService(QuoteRepository quoteRepository, BookRepository bookRepository) {
        this.quoteRepository = quoteRepository;
        this.bookRepository = bookRepository;
    }

    public List<Quote> getByBookId(Long bookId) {
        return quoteRepository.findByBookIdOrderByPageNumberAsc(bookId);
    }

    public Quote create(Long bookId, String content, Integer pageNumber) {
        Book book = bookRepository.findById(bookId).orElse(null);
        if (book == null) return null;

        Quote quote = new Quote();
        quote.setContent(content);
        quote.setPageNumber(pageNumber);
        quote.setBook(book);
        return quoteRepository.save(quote);
    }

    public Quote update(Long id, String content, Integer pageNumber) {
        Optional<Quote> opt = quoteRepository.findById(id);
        if (opt.isEmpty()) return null;

        Quote quote = opt.get();
        quote.setContent(content);
        quote.setPageNumber(pageNumber);
        return quoteRepository.save(quote);
    }

    public boolean delete(Long id) {
        if (quoteRepository.existsById(id)) {
            quoteRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
