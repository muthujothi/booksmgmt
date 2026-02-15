package com.booksmgmt.repository;

import com.booksmgmt.model.Memory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MemoryRepository extends JpaRepository<Memory, Long> {

    List<Memory> findByBookIdOrderByCreatedAtDesc(Long bookId);
}
