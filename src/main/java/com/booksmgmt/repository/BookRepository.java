package com.booksmgmt.repository;

import com.booksmgmt.model.Book;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookRepository extends JpaRepository<Book, Long> {

    @Query("SELECT b FROM Book b ORDER BY CASE WHEN b.rating IS NULL THEN 1 ELSE 0 END, b.rating DESC")
    List<Book> findAllSortedByRating();

}
