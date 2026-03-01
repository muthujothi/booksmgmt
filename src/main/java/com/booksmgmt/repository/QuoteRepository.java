package com.booksmgmt.repository;

import com.booksmgmt.model.Quote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuoteRepository extends JpaRepository<Quote, Long> {

    List<Quote> findByBookIdOrderByPageNumberAsc(Long bookId);
}
