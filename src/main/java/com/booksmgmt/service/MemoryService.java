package com.booksmgmt.service;

import com.booksmgmt.model.Book;
import com.booksmgmt.model.Memory;
import com.booksmgmt.repository.BookRepository;
import com.booksmgmt.repository.MemoryRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MemoryService {

    private final MemoryRepository memoryRepository;
    private final BookRepository bookRepository;

    public MemoryService(MemoryRepository memoryRepository, BookRepository bookRepository) {
        this.memoryRepository = memoryRepository;
        this.bookRepository = bookRepository;
    }

    public List<Memory> getByBookId(Long bookId) {
        return memoryRepository.findByBookIdOrderByCreatedAtDesc(bookId);
    }

    public Memory create(Long bookId, String content) {
        Book book = bookRepository.findById(bookId).orElse(null);
        if (book == null) return null;

        Memory memory = new Memory();
        memory.setContent(content);
        memory.setBook(book);
        return memoryRepository.save(memory);
    }

    public Memory update(Long id, String content) {
        Optional<Memory> opt = memoryRepository.findById(id);
        if (opt.isEmpty()) return null;

        Memory memory = opt.get();
        memory.setContent(content);
        return memoryRepository.save(memory);
    }

    public boolean delete(Long id) {
        if (memoryRepository.existsById(id)) {
            memoryRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
