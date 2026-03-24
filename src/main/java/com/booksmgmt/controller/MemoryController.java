package com.booksmgmt.controller;

import com.booksmgmt.model.Memory;
import com.booksmgmt.service.MemoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/books/{bookId}/memories")
public class MemoryController {

    private final MemoryService memoryService;

    public MemoryController(MemoryService memoryService) {
        this.memoryService = memoryService;
    }

    @GetMapping
    public List<Memory> getMemories(@PathVariable Long bookId) {
        return memoryService.getByBookId(bookId);
    }

    @PostMapping
    public ResponseEntity<Memory> createMemory(@PathVariable Long bookId, @RequestBody Map<String, String> body) {
        String content = body.get("content");

        Memory memory = memoryService.create(bookId, content);
        return memory != null ? ResponseEntity.ok(memory) : ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Memory> updateMemory(@PathVariable Long bookId, @PathVariable Long id,
                                               @RequestBody Map<String, String> body) {
        String content = body.get("content");

        Memory memory = memoryService.update(id, content);
        return memory != null ? ResponseEntity.ok(memory) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMemory(@PathVariable Long bookId, @PathVariable Long id) {
        return memoryService.delete(id) ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }
}
